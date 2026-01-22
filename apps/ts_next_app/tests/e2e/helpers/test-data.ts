import { Page, expect } from '@playwright/test';

/**
 * Navigate to a specific tab in the meditation app
 */
export async function navigateToTab(page: Page, tabName: string) {
  await page.click(`text=${tabName}`);
  await page.waitForLoadState('networkidle');
}

/**
 * Expand a method accordion in the Reflections Explorer
 */
export async function expandMethod(page: Page, methodName: string) {
  const accordion = page.locator(`text=${methodName}`).first();
  await accordion.click();
  await page.waitForTimeout(300); // Wait for accordion animation
}

/**
 * Fill parameter inputs for a method
 */
export async function fillParameters(page: Page, params: Record<string, any>) {
  for (const [key, value] of Object.entries(params)) {
    const input = page.locator(`input[placeholder*="${key}"], textarea[placeholder*="${key}"]`).first();
    await input.fill(typeof value === 'string' ? value : JSON.stringify(value));
  }
}

/**
 * Click the Execute button for a method
 */
export async function clickExecute(page: Page, methodName: string) {
  // Find the Execute button within the method's accordion section
  const section = page.locator(`text=${methodName}`).locator('..').locator('..');
  const executeButton = section.locator('button:has-text("Execute")').first();
  await executeButton.click();
}

/**
 * Execute a method with parameters
 */
export async function executeMethod(
  page: Page,
  methodName: string,
  params: Record<string, any> = {}
) {
  await expandMethod(page, methodName);
  if (Object.keys(params).length > 0) {
    await fillParameters(page, params);
  }
  await clickExecute(page, methodName);
  await waitForResult(page);
}

/**
 * Wait for a result to appear (loading indicator disappears)
 */
export async function waitForResult(page: Page, timeout: number = 10000) {
  // Wait for "Executing..." to disappear
  await page.waitForSelector('text=Executing...', { state: 'hidden', timeout });
  // Small delay to ensure result is fully rendered
  await page.waitForTimeout(500);
}

/**
 * Get the result text from the last executed method
 */
export async function getResultText(page: Page): Promise<string> {
  const resultContainer = page.locator('pre, .result-container, [class*="result"]').last();
  return await resultContainer.textContent() || '';
}

/**
 * Get the result as JSON
 */
export async function getResultJSON(page: Page): Promise<any> {
  const text = await getResultText(page);
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Check if a cache indicator is present
 */
export async function hasCacheIndicator(page: Page): Promise<boolean> {
  const cacheIndicator = page.locator('text=FROM CACHE');
  return await cacheIndicator.isVisible();
}

/**
 * Get execution time from the result display
 */
export async function getExecutionTime(page: Page): Promise<number | null> {
  const timeText = await page.locator('text=/\\d+(\\.\\d+)?ms/').textContent();
  if (!timeText) return null;
  const match = timeText.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Generate test events using the Event Generator tab
 */
export async function generateEvents(
  page: Page,
  eventType: string,
  count: number
) {
  await navigateToTab(page, 'Event Generator');

  // Fill in event type
  await page.fill('input[placeholder*="event_type"], input[name="event_type"]', eventType);

  // Fill in count
  await page.fill('input[type="number"], input[placeholder*="count"]', count.toString());

  // Click generate button
  await page.click('button:has-text("Generate")');

  // Wait for generation to complete
  await page.waitForSelector('text=Generated', { timeout: 5000 });
}

/**
 * Get the current session ID from the app
 */
export async function getCurrentSessionId(page: Page): Promise<string> {
  // Look for session ID in the UI (usually pre-filled in session_id inputs)
  const sessionInput = page.locator('input[placeholder*="session_id"]').first();
  const value = await sessionInput.inputValue();
  return value;
}

/**
 * Wait for cache metrics to update to expected values
 */
export async function waitForCacheMetrics(
  page: Page,
  expectedHits?: number,
  expectedMisses?: number,
  timeout: number = 5000
) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const metricsText = await page.locator('text=/Cache.*hits/i').textContent();

    if (expectedHits !== undefined) {
      if (metricsText?.includes(`${expectedHits} hit`)) {
        return;
      }
    }

    if (expectedMisses !== undefined) {
      if (metricsText?.includes(`${expectedMisses} miss`)) {
        return;
      }
    }

    await page.waitForTimeout(200);
  }
}

/**
 * Clear the cache using the clearCache method
 */
export async function clearCache(page: Page) {
  await executeMethod(page, 'clearCache');
}

/**
 * Get cache stats
 */
export async function getCacheStats(page: Page): Promise<{ hits: number; misses: number; total: number } | null> {
  await executeMethod(page, 'getCacheStats');
  const result = await getResultJSON(page);
  return result;
}

/**
 * Check if a table is rendered with specific headers
 */
export async function verifyTableHeaders(page: Page, headers: string[]): Promise<boolean> {
  for (const header of headers) {
    const headerElement = page.locator(`th:has-text("${header}"), td:has-text("${header}")`);
    const isVisible = await headerElement.isVisible();
    if (!isVisible) return false;
  }
  return true;
}

/**
 * Get table row count
 */
export async function getTableRowCount(page: Page): Promise<number> {
  const rows = page.locator('tr').filter({ hasNotText: /Event Type|Count|First Seen/ });
  return await rows.count();
}

/**
 * Wait for visualization component to render
 */
export async function waitForVisualization(page: Page, componentType: string, timeout: number = 5000) {
  // Wait for the visualization to appear based on component-specific markers
  const markers: Record<string, string> = {
    'EventTypeStatsView': 'text=Event Type',
    'PayloadSchemaView': 'text=Common Fields',
    'SessionInspectionView': 'text=Event Type Breakdown',
    'TraceInspectionView': 'text=Event Chain',
    'DatabaseStatsView': 'text=Database Overview'
  };

  const marker = markers[componentType];
  if (marker) {
    await page.waitForSelector(marker, { timeout });
  }
}

/**
 * Get a trace ID from getTraces method
 */
export async function getTraceId(page: Page): Promise<string> {
  await executeMethod(page, 'getTraces', { limit: 1 });
  const result = await getResultJSON(page);
  return result?.[0]?.trace_id || '';
}

/**
 * Get an event type from getEventTypes method
 */
export async function getEventType(page: Page): Promise<string> {
  await executeMethod(page, 'getEventTypes');
  const result = await getResultJSON(page);
  return result?.[0] || '';
}

/**
 * Get an event ID from queryEvents method
 */
export async function getEventId(page: Page): Promise<string> {
  await executeMethod(page, 'queryEvents', { limit: 1 });
  const result = await getResultJSON(page);
  return result?.events?.[0]?.event_id || '';
}
