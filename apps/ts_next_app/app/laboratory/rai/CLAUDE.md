# RAI - Medical Note Generation App

## Quick Orientation
- Entry: `rai.tsx` — view router, wraps everything in `InsightsProvider`
- State: Single Zustand store in `store/useRaiStore.ts` — all app state lives here
- Types: `types.ts`, Constants: `constants.ts`
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

### Telemetry (Insight Events)
Session-exported events emitted by the settings/storage flow:

| Event | Source | Payload |
|-------|--------|---------|
| `rai_store_init` | `storage.ts` | `bootstrap`, `resolved_mode`, `is_new_instance`, `cloud_upgraded` |
| `rai_legacy_migration` | `useRaiStore.ts` | `migrated`, `skipped` |
| `rai_settings_loaded` | `useRaiStore.ts` | `source`, `had_migration`, `raw_stored`, `merged` |
| `rai_settings_updated` | `useRaiStore.ts` | `changed_keys`, `before`, `after` (full settings) |
| `rai_settings_saved` | `useRaiStore.ts` | `ok`, `mode`, `settings` (full settings) |
| `appdata_load/save` | `app_data_store.ts` | `data_key`, `ok`, `mode`, `duration_ms`, `content` |

## Debugging
- `window.getRaiState()` — current store snapshot
- `window.raiInsights` — InsightsClient instance
- `window.tsw` — tidyscripts web library
- `bin/save_session rai` — export session data for offline analysis
- `await window.test_app_data_store()` — run storage test suite (34 tests)

## Adding Things
- **New view**: update `ViewType` in types.ts, add case in `renderView()`, add route
- **New setting**: extend `AppSettings` interface, add to `DEFAULT_SETTINGS`, handle migration in `loadSettings`
- **New template variable**: extend `TEMPLATE_SYNTAX` patterns, update prompt builder
- **New insight event**: use `getRaiStore().emitEvent(type, payload)` — auto-tagged with `app_id`
