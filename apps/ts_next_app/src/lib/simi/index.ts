/**
 * Simi — Simulation Interface
 *
 * App-agnostic declarative test workflows that compile into
 * runnable functions on the Playwright bridge.
 */

export { executeWorkflow } from './runner';
export type {
  SimiWorkflow,
  WorkflowStep,
  ActionStep,
  AssertStep,
  WaitForStep,
  Resolver,
  StateResolver,
  FindResolver,
  EvalResolver,
  RunOpts,
  RunResult,
  StepResult,
} from './types';

/** Helper to define a workflow with type checking */
export function defineWorkflow(workflow: import('./types').SimiWorkflow): import('./types').SimiWorkflow {
  return workflow;
}
