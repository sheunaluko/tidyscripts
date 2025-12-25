// Test Runner Library - Parallel test execution and caching logic

import * as tsw from 'tidyscripts_web';
import { ModelTestResult, TestRun } from '../types';
import { generateNote } from './noteGenerator';

const log = tsw.common.logger.get_logger({ id: 'testRunner' });

/**
 * Generate SHA-256 hash for test input caching
 * @param template - Template content
 * @param inputText - Input text content
 * @returns SHA-256 hash string
 */
export async function generateTestHash(
  template: string,
  inputText: string
): Promise<string> {
  // Use separator unlikely to appear naturally in medical text
  const combined = `${template}|||${inputText}`;
  const hash = await tsw.common.apis.cryptography.sha256(combined);
  return hash;
}

/**
 * Find cached results for a given hash
 * @param hash - Test input hash
 * @param testHistory - Array of past test runs
 * @returns Cached results array or null if not found
 */
export function findCachedResults(
  hash: string,
  testHistory: TestRun[]
): ModelTestResult[] | null {
  const cached = testHistory.find(run => run.hash === hash);

  if (cached && cached.results.length > 0) {
    // Return only successful results
    return cached.results.filter(r => r.status === 'success');
  }

  return null;
}

/**
 * Merge cached results with newly selected models
 * @param selectedModels - Models selected for this test run
 * @param cachedResults - Previously cached results (or null)
 * @returns Object with models to run and cached results to reuse
 */
export function mergeWithCache(
  selectedModels: string[],
  cachedResults: ModelTestResult[] | null
): { toRun: string[]; cached: ModelTestResult[] } {
  if (!cachedResults) {
    return { toRun: selectedModels, cached: [] };
  }

  // Build set of models we already have cached
  const cachedModelSet = new Set(
    cachedResults.map(r => r.model)
  );

  // Models we need to run (not in cache)
  const toRun = selectedModels.filter(
    model => !cachedModelSet.has(model)
  );

  // Cached results that are still selected
  const cached = cachedResults.filter(
    r => selectedModels.includes(r.model)
  );

  log({
    msg: 'Cache merge',
    selectedModels: selectedModels.length,
    cached: cached.length,
    toRun: toRun.length
  });

  return { toRun, cached };
}

/**
 * Execute test run for multiple models in parallel
 * @param template - Template content
 * @param inputText - Input text (wrapped as array for generateNote)
 * @param models - Array of model names to test
 * @param systemPrompt - System prompt for note generation
 * @param onProgress - Callback for progress updates
 * @returns Array of model test results
 */
export async function runParallelTest(
  template: string,
  inputText: string,
  models: string[],
  systemPrompt: string,
  onProgress: (result: ModelTestResult) => void
): Promise<ModelTestResult[]> {
  log({ msg: 'Starting parallel test', models: models.length });

  const promises = models.map(async (model): Promise<ModelTestResult> => {
    const result: ModelTestResult = {
      model,
      status: 'running',
      note: null,
      error: null,
      startTime: new Date(),
      endTime: null,
      duration: null,
    };

    // Notify progress - starting
    onProgress({ ...result });

    try {
      // Call note generation with input wrapped in array
      const note = await generateNote(
        model,
        template,
        [inputText], // Wrap in array as expected by generateNote
        systemPrompt,
        3 // retries
      );

      result.status = 'success';
      result.note = note;
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime!.getTime();

      log({ msg: 'Model test success', model, duration: result.duration });

      // Notify progress - success
      onProgress({ ...result });
      return result;

    } catch (error) {
      result.status = 'error';
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime!.getTime();

      log({ msg: 'Model test error', model, error: result.error });

      // Notify progress - error
      onProgress({ ...result });
      return result;
    }
  });

  // Wait for all to complete (doesn't throw on individual failures)
  const results = await Promise.allSettled(promises);

  // Extract values from settled promises
  const finalResults = results.map(r =>
    r.status === 'fulfilled' ? r.value : r.reason
  );

  log({
    msg: 'Parallel test complete',
    total: finalResults.length,
    success: finalResults.filter(r => r.status === 'success').length,
    error: finalResults.filter(r => r.status === 'error').length,
  });

  return finalResults;
}
