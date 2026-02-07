export const id = 'testing';
export const title = 'Testing & Debugging';
export const order = 5;

export const content = `
## Test Suite

R.AI includes a self-cleaning browser console test suite for the AppDataStore storage layer. It verifies all backends, the facade API, migration, telemetry, and edge cases.

### Running Tests

Open the browser console on the RAI app and run:

\`\`\`js
await window.test_app_data_store()
\`\`\`

This executes 34 tests across 9 categories:

| Category | Tests | What it covers |
|----------|-------|---------------|
| A. LocalStorage Unit | 9 | Save/load, timestamps, remove, list, metadata |
| B. Facade | 7 | get/set, remove, list, loadFull, saveFull |
| C. Telemetry | 1 | InsightsClient event capture |
| D. Backend Switching | 1 | Switch between localStorage and SurrealDB |
| E. Migration | 1 | Migrate data between backends |
| F. Legacy Migration | 2 | Old key format migration + idempotency |
| G. SurrealDB Mock | 2 | Query generation, error handling |
| H. Edge Cases | 4 | Large content, special chars, empty values, concurrency |
| I. Live SurrealDB | 7 | Real database round-trips (requires login) |

### Live Database Tests

Section I tests hit the real SurrealDB cloud database. They require:

1. **Firebase authentication** — you must be logged in
2. **Database connectivity** — the SurrealDB cloud instance must be reachable

If the database is unavailable, these tests are automatically skipped (shown as \`[SKIP]\`) and do not count as failures.

### Cleanup

Tests use the app_id \`__test__\` and auto-clean after each run. For manual cleanup:

\`\`\`js
await window.clear_app_data_store_test()
\`\`\`

This removes all \`__test__\` keys from both localStorage and SurrealDB.

### Session Export

Test results are captured by the insights telemetry system. To export the latest session:

\`\`\`bash
cd tidyscripts
bin/save_session rai
\`\`\`

This writes a JSON file to \`.session_data/\` containing all test events with pass/fail status, timing, and diagnostic data. Useful for CI-style analysis without a browser open.

### Model Comparison Testing

The **Test Interface** (enable in Settings > Advanced Features) lets you compare note generation across multiple AI models:

1. Select a template and enter test input
2. Choose models to compare (Anthropic, Google, OpenAI)
3. Run the test — each model generates a note in parallel
4. Optionally run AI analysis to compare the outputs

Test runs are saved to history and can be revisited via deep links.
`;
