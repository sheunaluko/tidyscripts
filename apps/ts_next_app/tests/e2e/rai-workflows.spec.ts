import { test, expect, type Page } from '@playwright/test';

// ─── Helper ─────────────────────────────────────────────────────────

interface RunResult {
  completed: boolean;
  workflow_id: string;
  total_ms: number;
  steps: { step: string; status: string; error?: string; duration_ms: number }[];
  error?: string;
}

/**
 * Navigate to RAI, wait for the Simi bridge to be ready, then run a workflow.
 * Returns the RunResult from the Simi runner.
 */
async function runWorkflow(page: Page, workflowName: string, timeoutMs = 30_000): Promise<RunResult> {
  await page.goto('/laboratory/rai');

  // Wait for the Simi bridge to be mounted (app fully initialized)
  await page.waitForFunction(
    () => (window as any).__rai__?.simi?.workflows,
    { timeout: 30_000 },
  );

  // Run the workflow
  const result = await page.evaluate(
    ({ name, timeout }) => {
      const bridge = (window as any).__rai__;
      const workflow = bridge.simi.workflows[name];
      if (!workflow) throw new Error(`Workflow "${name}" not found. Available: ${bridge.simi.list().join(', ')}`);

      // Race workflow against a timeout so Playwright doesn't hang
      return Promise.race([
        workflow({ speed: 3 }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Workflow "${name}" exceeded ${timeout}ms`)), timeout),
        ),
      ]);
    },
    { name: workflowName, timeout: timeoutMs },
  );

  return result as RunResult;
}

function assertWorkflowPassed(result: RunResult) {
  // Build a detailed failure message showing which step failed
  if (!result.completed) {
    const failedSteps = result.steps
      .filter(s => s.status === 'error')
      .map(s => `  [${s.step}] ${s.error}`)
      .join('\n');
    const summary = `Workflow "${result.workflow_id}" failed (${result.total_ms}ms):\n${failedSteps || result.error}`;
    expect(result.completed, summary).toBe(true);
  }
  expect(result.completed).toBe(true);
}

// ─── Smoke Tests (no LLM calls, fast) ──────────────────────────────

test.describe('smoke', () => {
  test('basic_note_flow', async ({ page }) => {
    const result = await runWorkflow(page, 'basic_note_flow');
    assertWorkflowPassed(result);
  });

  test('template_crud_flow', async ({ page }) => {
    const result = await runWorkflow(page, 'template_crud_flow');
    assertWorkflowPassed(result);
  });

  test('settings_persistence_flow', async ({ page }) => {
    const result = await runWorkflow(page, 'settings_persistence_flow');
    assertWorkflowPassed(result);
  });

  test('dot_phrase_crud_flow', async ({ page }) => {
    const result = await runWorkflow(page, 'dot_phrase_crud_flow');
    assertWorkflowPassed(result);
  });

  test('multi_template_selection_flow', async ({ page }) => {
    const result = await runWorkflow(page, 'multi_template_selection_flow');
    assertWorkflowPassed(result);
  });

  test('logged_out_cloud_fallback_flow', async ({ page }) => {
    const result = await runWorkflow(page, 'logged_out_cloud_fallback_flow');
    assertWorkflowPassed(result);
  });
});

// ─── E2E Tests (LLM calls, longer timeouts) ────────────────────────

test.describe('e2e', () => {
  // These tests make real LLM API calls and need extended timeouts
  test.setTimeout(180_000);

  test('full_note_flow', async ({ page }) => {
    const result = await runWorkflow(page, 'full_note_flow', 150_000);
    assertWorkflowPassed(result);
  });

  test('text_input_note_flow', async ({ page }) => {
    const result = await runWorkflow(page, 'text_input_note_flow', 150_000);
    assertWorkflowPassed(result);
  });
});
