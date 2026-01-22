import { test, expect } from '@playwright/test';

test.describe('Reflections Explorer - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/laboratory/meditation');
    await page.click('text=Reflections Explorer');
    // Wait for the tab content to be visible
    await page.waitForSelector('text=Core Query Methods', { timeout: 5000 });
  });

  test('can execute a query method and get results', async ({ page }) => {
    // Expand getDatabaseStats method
    await page.click('text=getDatabaseStats');

    // Wait for Execute button to become visible (accordion animation)
    const executeButton = page.locator('button:has-text("Execute")').first();
    await executeButton.waitFor({ state: 'visible', timeout: 5000 });

    // Click Execute button
    await executeButton.click();

    // Wait for result to appear
    await page.waitForSelector('text=/Database Overview|Total Events/i', { timeout: 10000 });

    // Verify result is displayed
    const hasResult = await page.locator('text=/Database Overview|Total Events/i').isVisible();
    expect(hasResult).toBe(true);
  });

  test('cache behavior works - second query shows FROM CACHE', async ({ page }) => {
    // Execute getDatabaseStats first time
    await page.click('text=getDatabaseStats');

    // Wait for Execute button and click
    const executeButton = page.locator('button:has-text("Execute")').first();
    await executeButton.waitFor({ state: 'visible', timeout: 5000 });
    await executeButton.click();

    // Wait for first result
    await page.waitForSelector('text=/Database Overview/i', { timeout: 5000 });

    // Check no cache indicator on first query
    let cacheIndicator = page.locator('text=FROM CACHE');
    let isCached = await cacheIndicator.isVisible().catch(() => false);
    expect(isCached).toBe(false);

    // Execute again
    await executeButton.click();

    // Wait for FROM CACHE indicator to appear
    await page.waitForSelector('text=FROM CACHE', { timeout: 5000 });

    isCached = await cacheIndicator.isVisible();
    expect(isCached).toBe(true);
  });

  test('autonomous test suite runs all 19 tests', async ({ page }) => {
    // Find and click Run All Tests button
    const runButton = page.locator('button:has-text("Run All Tests")');
    await runButton.click();

    // Wait for tests to complete (up to 60 seconds)
    await page.waitForSelector('button:has-text("Run All Tests")', {
      state: 'visible',
      timeout: 60000
    });

    // Check for results section
    const resultsVisible = await page.locator('text=/Results:|passed/i').isVisible();
    expect(resultsVisible).toBe(true);

    // Verify we see test count (might be 17/19, 18/19, or 19/19)
    const resultsText = await page.locator('text=/\\d+\\/19/').textContent();
    expect(resultsText).toMatch(/\d+\/19/);
  });

  test('clear cache button works', async ({ page }) => {
    // Execute a query to populate cache
    await page.click('text=getEventTypes');

    // Wait for Execute button and click
    const executeButton = page.locator('button:has-text("Execute")').first();
    await executeButton.waitFor({ state: 'visible', timeout: 5000 });
    await executeButton.click();
    await page.waitForSelector('pre, .result', { timeout: 5000 });

    // Execute again to verify cache hit
    await executeButton.click();
    await page.waitForSelector('text=FROM CACHE', { timeout: 5000 });

    const cacheIndicator = page.locator('text=FROM CACHE');
    let isCached = await cacheIndicator.isVisible();
    expect(isCached).toBe(true);

    // Clear cache using the red "Clear Cache" button in ReflectionsStateView
    const clearButton = page.locator('button:has-text("Clear Cache")').first();
    await clearButton.click();
    await page.waitForTimeout(500); // Brief wait for cache to clear

    // Execute query again - should NOT be cached
    await page.click('text=getEventTypes');
    await executeButton.waitFor({ state: 'visible', timeout: 5000 });
    await executeButton.click();
    await page.waitForSelector('pre, .result', { timeout: 5000 });

    isCached = await cacheIndicator.isVisible().catch(() => false);
    expect(isCached).toBe(false);
  });

  test('can query different method types', async ({ page }) => {
    // Test a core query method
    await page.click('text=queryEvents');
    let executeButton = page.locator('button:has-text("Execute")').first();
    await executeButton.waitFor({ state: 'visible', timeout: 5000 });
    await executeButton.click();
    await page.waitForSelector('pre, .result', { timeout: 5000 });
    let hasResult = await page.locator('pre, .result').isVisible();
    expect(hasResult).toBe(true);

    // Test an exploration method
    await page.click('text=getEventTypes');
    executeButton = page.locator('button:has-text("Execute")').first();
    await executeButton.waitFor({ state: 'visible', timeout: 5000 });
    await executeButton.click();
    await page.waitForSelector('pre, .result', { timeout: 5000 });
    hasResult = await page.locator('pre, .result').isVisible();
    expect(hasResult).toBe(true);
  });
});

test.describe('Reflections Explorer - Integration', () => {
  test('generate events and query them back', async ({ page }) => {
    await page.goto('/laboratory/meditation');

    // Generate test events
    await page.click('text=Event Generator');

    // Wait for Event Generator tab to load, then fill inputs
    const eventTypeInput = page.locator('input').filter({ hasText: '' }).first();
    await eventTypeInput.waitFor({ state: 'visible', timeout: 5000 });
    await eventTypeInput.fill('e2e_test_event');

    // Fill in count (look for number input)
    const countInput = page.locator('input[type="number"]').first();
    await countInput.fill('5');

    // Click Generate and wait for completion
    await page.click('button:has-text("Generate")');
    await page.waitForTimeout(1000); // Brief wait for events to be created

    // Switch to Reflections Explorer
    await page.click('text=Reflections Explorer');
    await page.waitForSelector('text=Core Query Methods', { timeout: 5000 });

    // Query for our events
    await page.click('text=getEventTypes');

    // Wait for Execute button and click
    const executeButton = page.locator('button:has-text("Execute")').first();
    await executeButton.waitFor({ state: 'visible', timeout: 5000 });
    await executeButton.click();

    // Wait for results
    await page.waitForSelector('pre, .result', { timeout: 5000 });

    // Verify our event type appears in results
    const resultText = await page.locator('pre, .result').textContent();
    expect(resultText).toContain('e2e_test_event');
  });
});
