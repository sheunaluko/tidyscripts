/**
 * Simi — Simulation Interface
 *
 * Type definitions for declarative test workflows.
 */

// ─── Resolvers ───────────────────────────────────────────────────────

/** Reads a dotted path from store state */
export interface StateResolver {
  $resolve: 'state';
  path: string;
}

/** Finds an item in an array at a state path */
export interface FindResolver {
  $resolve: 'find';
  path: string;
  match?: Record<string, any>;
  index?: number;
}

/** Evaluates a function against state */
export interface EvalResolver {
  $resolve: 'eval';
  fn: (state: any) => any;
}

export type Resolver = StateResolver | FindResolver | EvalResolver;

// ─── Steps ───────────────────────────────────────────────────────────

export interface ActionStep {
  id?: string;
  action: string;
  args?: any[];
  wait?: number;
  /** Timeout in ms for async actions. If the action's promise doesn't resolve within this window, the step fails and the workflow stops. */
  timeout?: number;
}

export interface AssertStep {
  assert: string;
  message?: string;
}

export interface WaitForStep {
  waitFor: string;
  timeout?: number;
}

export type WorkflowStep = ActionStep | AssertStep | WaitForStep;

// ─── Workflow ────────────────────────────────────────────────────────

export interface SimiWorkflow {
  id: string;
  app: string;
  tags?: string[];
  steps: WorkflowStep[];
}

// ─── Execution ───────────────────────────────────────────────────────

export interface RunOpts {
  speed?: number;
}

export interface StepResult {
  step: string;
  result?: any;
  duration_ms: number;
  status: 'ok' | 'error';
  error?: string;
}

export interface RunResult {
  completed: boolean;
  workflow_id: string;
  total_ms: number;
  steps: StepResult[];
  error?: string;
}
