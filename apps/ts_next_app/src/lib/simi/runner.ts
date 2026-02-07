/**
 * Simi — Workflow execution engine
 *
 * Runs a SimiWorkflow step-by-step: dispatches actions, evaluates
 * assertions, waits for conditions, and emits telemetry throughout.
 */

import type {
  SimiWorkflow,
  RunOpts,
  RunResult,
  StepResult,
  ActionStep,
  AssertStep,
  WaitForStep,
  WorkflowStep,
} from './types';
import { resolveArgs } from './resolvers';

type InsightsClient = {
  addEvent: (type: string, payload: Record<string, any>, options?: { tags?: string[]; duration_ms?: number }) => void;
  addSessionTags?: (tags: string[]) => void;
} | null;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function evaluateCondition(expression: string, state: any): boolean {
  try {
    return new Function('state', 'return ' + expression)(state);
  } catch {
    return false;
  }
}

async function pollCondition(
  expression: string,
  getState: () => any,
  timeout: number,
): Promise<{ ok: boolean; waited_ms: number }> {
  const start = performance.now();
  while (performance.now() - start < timeout) {
    if (evaluateCondition(expression, getState())) {
      return { ok: true, waited_ms: Math.round(performance.now() - start) };
    }
    await sleep(100);
  }
  return { ok: false, waited_ms: Math.round(performance.now() - start) };
}

function isActionStep(step: WorkflowStep): step is ActionStep {
  return 'action' in step;
}

function isAssertStep(step: WorkflowStep): step is AssertStep {
  return 'assert' in step;
}

function isWaitForStep(step: WorkflowStep): step is WaitForStep {
  return 'waitFor' in step;
}

function stepLabel(step: WorkflowStep, index: number): string {
  if (isActionStep(step)) return step.id || step.action;
  if (isAssertStep(step)) return `assert_${index}`;
  if (isWaitForStep(step)) return `waitFor_${index}`;
  return `step_${index}`;
}

export async function executeWorkflow(
  workflow: SimiWorkflow,
  dispatch: (action: string, ...args: any[]) => any,
  getState: () => any,
  getClient: () => InsightsClient,
  opts?: RunOpts,
): Promise<RunResult> {
  const speed = opts?.speed ?? 1;
  const client = getClient();
  const stepResults: StepResult[] = [];
  const workflowStart = performance.now();

  // Tag session
  const tags = ['simi', workflow.app, workflow.id, ...(workflow.tags || [])];
  if (client?.addSessionTags) {
    client.addSessionTags(tags);
  }

  // Emit workflow start
  client?.addEvent('simi_workflow_start', {
    workflow_id: workflow.id,
    app: workflow.app,
    step_count: workflow.steps.length,
    tags,
  });

  let error: string | undefined;

  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    const label = stepLabel(step, i);
    const stepStart = performance.now();

    try {
      if (isActionStep(step)) {
        // Resolve args
        let resolvedArgs: any[] = [];
        if (step.args && step.args.length > 0) {
          const { resolved, resolverEvents } = resolveArgs(step.args, getState);
          resolvedArgs = resolved;

          // Emit resolver events
          for (const evt of resolverEvents) {
            client?.addEvent('simi_resolve', {
              workflow_id: workflow.id,
              step: label,
              resolver_type: evt.resolver.$resolve,
              status: evt.status,
              ...(evt.error ? { error: evt.error } : {}),
            });
          }
        }

        // Dispatch
        const result = dispatch(step.action, ...resolvedArgs);
        const duration_ms = Math.round(performance.now() - stepStart);

        stepResults.push({ step: label, result, duration_ms, status: 'ok' });
        client?.addEvent('simi_step', {
          workflow_id: workflow.id,
          step: label,
          type: 'action',
          action: step.action,
          duration_ms,
          status: 'ok',
        });

        // Wait after dispatch
        if (step.wait) {
          await sleep(step.wait / speed);
        }
      } else if (isAssertStep(step)) {
        const passed = evaluateCondition(step.assert, getState());
        const duration_ms = Math.round(performance.now() - stepStart);

        if (!passed) {
          const msg = step.message || `Assertion failed: ${step.assert}`;
          stepResults.push({ step: label, duration_ms, status: 'error', error: msg });
          client?.addEvent('simi_step', {
            workflow_id: workflow.id,
            step: label,
            type: 'assert',
            expression: step.assert,
            duration_ms,
            status: 'error',
            error: msg,
          });
          error = msg;
          break;
        }

        stepResults.push({ step: label, duration_ms, status: 'ok' });
        client?.addEvent('simi_step', {
          workflow_id: workflow.id,
          step: label,
          type: 'assert',
          expression: step.assert,
          duration_ms,
          status: 'ok',
        });
      } else if (isWaitForStep(step)) {
        const timeout = step.timeout ?? 10000;
        const { ok, waited_ms } = await pollCondition(step.waitFor, getState, timeout);
        const duration_ms = Math.round(performance.now() - stepStart);

        if (!ok) {
          const msg = `Timed out after ${timeout}ms waiting for: ${step.waitFor}`;
          stepResults.push({ step: label, duration_ms, status: 'error', error: msg });
          client?.addEvent('simi_step', {
            workflow_id: workflow.id,
            step: label,
            type: 'waitFor',
            expression: step.waitFor,
            waited_ms,
            duration_ms,
            status: 'error',
            error: msg,
          });
          error = msg;
          break;
        }

        stepResults.push({ step: label, duration_ms, status: 'ok' });
        client?.addEvent('simi_step', {
          workflow_id: workflow.id,
          step: label,
          type: 'waitFor',
          expression: step.waitFor,
          waited_ms,
          duration_ms,
          status: 'ok',
        });
      }
    } catch (err: any) {
      const duration_ms = Math.round(performance.now() - stepStart);
      const msg = err?.message || String(err);
      stepResults.push({ step: label, duration_ms, status: 'error', error: msg });
      client?.addEvent('simi_step', {
        workflow_id: workflow.id,
        step: label,
        type: isActionStep(step) ? 'action' : 'unknown',
        duration_ms,
        status: 'error',
        error: msg,
      });
      error = msg;
      break;
    }
  }

  const total_ms = Math.round(performance.now() - workflowStart);
  const completed = !error;
  const steps_passed = stepResults.filter(s => s.status === 'ok').length;
  const steps_failed = stepResults.filter(s => s.status === 'error').length;

  client?.addEvent('simi_workflow_complete', {
    workflow_id: workflow.id,
    total_ms,
    steps_passed,
    steps_failed,
    completed,
    ...(error ? { error } : {}),
  });

  return {
    completed,
    workflow_id: workflow.id,
    total_ms,
    steps: stepResults,
    ...(error ? { error } : {}),
  };
}
