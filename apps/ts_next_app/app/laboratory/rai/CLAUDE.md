# RAI - Medical Note Generation App

## Quick Orientation
- Entry: `rai.tsx` — view router, wraps everything in `InsightsProvider`
- State: Single Zustand store in `store/useRaiStore.ts` — all app state lives here
- Types: `types.ts`, Constants: `constants.ts`
- Simi workflows: `simi/` — declarative test workflows for simulation and Playwright
- Full architecture: `docs/architecture.ts` (exported as in-app manual content)

## Key Patterns

### View Flow
`template_picker → information_input → note_generator`
Hash-based routing (`#templates`, `#input`, `#generator`, `#settings`, `#test`, `#manual`)

### Initialization Order (matters)
1. InsightsProvider wraps everything
2. `loadSettings(insightsClient)` runs first — resolves storage backend (local vs cloud)
   - Calls `migrateLegacyLocalStorage()` (idempotent, flag-gated)
   - Calls `getRaiStore(insights, queryFn)` — creates singleton or upgrades existing instance to cloud if needed
   - Emits `rai_store_init`, `rai_legacy_migration`, `rai_settings_loaded` insight events
3. Then `loadTemplates`, `loadTestHistory`, `loadDotPhrases` run in parallel via `Promise.all` (with individual `.catch()` handlers)

### Storage (AppDataStore Integration)
- Singleton: `getRaiStore()` in `lib/storage.ts` — scoped to `app_id='rai'`
- Data keys: `settings`, `custom_templates`, `test_runs`, `dot_phrases` (defined in `RAI_DATA_KEYS`)
- Backend mode: persisted in `__backend_mode__` localStorage flag, not in AppSettings
- `getRaiStore(insights, cloudQueryFn)` handles late `cloudQueryFn` — if singleton was created before the query function was available and mode flag says cloud, it upgrades via `switchToCloud()`
- `bootstrapBackendModeFlag()` detects cloud users from stored settings on first load
- AppDataStore details: see `apps/ts_next_app/CLAUDE.md` → AppDataStore section

### Voice/Device Settings (Tivi Settings Module)
- Voice/device settings are **not** in AppSettings — they live in tivi's settings module (`components/tivi/lib/settings.ts`)
- Always stored in localStorage (device-local, never synced to cloud)
- Includes: VAD thresholds, tiviMode, powerThreshold, enableInterruption, playbackRate, defaultVoiceURI, language, verbose
- Shared across all apps that use tivi (RAI, Cortex_0, etc.)
- React hook: `useTiviSettings()` — returns `{ settings, updateSettings, resetSettings }`
- Backend is swappable via `setTiviSettingsBackend()` interface
- One-time migration from RAI AppSettings on first load (flag-gated: `tivi-settings-migrated-from-rai`)

### Template Syntax
```
{{ @variable | fallback }}                              # presence/absence
{{ @variable? | true_text | false_text | undefined }}   # boolean
@END_TEMPLATE                                           # content after goes to voice agent only
```

### Note Generation
- Provider auto-detected from model name (`claude-*` → anthropic, `gemini-*` → gemini, else → openai)
- Routes to `/api/{provider}_structured_response`
- `generateNote()` — builds template-filling prompt via `buildNotePrompt()`, uses structured output with Zod
- `callLLMDirect()` — sends system/user prompts directly without template wrapping (used for analysis)
- Tracked via insightsClient event chains

### Checkpoints (dual system)
- `analyticsCheckpoints` — append-only, immutable (telemetry)
- `uiCheckpoints` — mutable, for browsing history
- `currentCheckpointIndex = -1` means live editing, `0+` means browsing

### Test Runner
- Hashes template+input to check cache, runs only new models
- Analysis uses `callLLMDirect()` (not `generateNote()`) to avoid template-filling prompt injection
- Keeps last 50 test runs

### Simi (Simulation Workflows)
- Location: `simi/` directory, workflows in `simi/workflows/`
- Declarative test workflows that compile into runnable functions on the Playwright bridge
- Wired into store via `workflows: raiWorkflows` in `createInsightStore` config
- Bridge: `window.__rai__.simi.workflows.NAME(opts?)` — runs workflow, returns `RunResult`
- List workflows: `window.__rai__.simi.list()` → `['basic_note_flow']`
- Speed control: `{ speed: 5 }` runs 5x faster
- Sessions auto-tagged: `['simi', 'rai', workflow_id, ...workflow.tags]`
- Existing workflows:
  - `basic_note_flow` — selects first template, adds patient info, navigates to generator (tags: `smoke`, `note_generation`)

### Telemetry (Insight Events)
Session-exported events emitted by the settings/storage flow:

| Event | Source | Payload |
|-------|--------|---------|
| `rai_store_init` | `storage.ts` | `bootstrap`, `resolved_mode`, `is_new_instance`, `cloud_upgraded` |
| `rai_legacy_migration` | `useRaiStore.ts` | `migrated`, `skipped` |
| `rai_settings_loaded` | `useRaiStore.ts` | `source`, `had_migration`, `raw_stored`, `merged` |
| `rai_settings_updated` | `useRaiStore.ts` | `changed_keys`, `before`, `after` (full settings) |
| `rai_settings_saved` | `useRaiStore.ts` | `ok`, `mode`, `settings` (full settings) |
| `rai_voice_settings_migrated_to_tivi` | `useRaiStore.ts` | `fields`, `values` (one-time migration) |
| `appdata_load/save` | `app_data_store.ts` | `data_key`, `ok`, `mode`, `duration_ms`, `content` |
| `session_tags` | `InsightsClient` | `tags` (cumulative array, emitted on each `addSessionTags` call) |
| `simi_workflow_start` | `simi/runner.ts` | `workflow_id`, `app`, `step_count`, `tags` |
| `simi_step` | `simi/runner.ts` | `workflow_id`, `step`, `type`, `duration_ms`, `status` |
| `simi_resolve` | `simi/runner.ts` | `workflow_id`, `step`, `resolver_type`, `status`, `error?` |
| `simi_workflow_complete` | `simi/runner.ts` | `workflow_id`, `total_ms`, `steps_passed`, `steps_failed`, `completed` |

## Debugging
- `window.getRaiState()` — current store snapshot
- `window.raiInsights` — InsightsClient instance
- `window.raiInsights.getSessionTags()` — current session tags
- `window.tsw` — tidyscripts web library
- `bin/save_session rai` — export session data for offline analysis
- `await window.test_app_data_store()` — run storage test suite (34 tests)
- `window.__rai__.simi.list()` — list available Simi workflows
- `await window.__rai__.simi.workflows.basic_note_flow()` — run smoke test workflow
- `await window.__rai__.simi.workflows.basic_note_flow({ speed: 5 })` — run fast

## Adding Things
- **New view**: update `ViewType` in types.ts, add case in `renderView()`, add route
- **New app setting**: extend `AppSettings` interface, add to `DEFAULT_SETTINGS`, handle migration in `loadSettings`
- **New voice/device setting**: extend `TiviSettings` in `tivi/lib/settings.ts`, add to `TIVI_DEFAULTS`
- **New template variable**: extend `TEMPLATE_SYNTAX` patterns, update prompt builder
- **New insight event**: use `getRaiStore().emitEvent(type, payload)` — auto-tagged with `app_id`
- **New Simi workflow**: create in `simi/workflows/`, export from `simi/index.ts` into `raiWorkflows` — auto-compiled and mounted on bridge
