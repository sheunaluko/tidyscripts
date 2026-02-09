# RAI - Medical Note Generation App

## Quick Orientation
- Entry: `rai.tsx` — view router, wraps everything in `InsightsProvider`
- URL: `/apps/rai` (rewritten from `app/laboratory/rai/` via `next.config.mjs` rewrites)
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
- **Default mode: cloud** — new users start in cloud mode so the auth check prompts them to log in or switch to local
- `getRaiStore(insights, cloudQueryFn)` handles late `cloudQueryFn` — if singleton was created before the query function was available and mode flag says cloud, it upgrades via `switchToCloud()`
- `bootstrapBackendModeFlag()` sets cloud as default for new users; detects existing cloud users from stored settings
- `migrateLocalToCloud()` — non-destructive: object keys skip if cloud has data, array keys (`custom_templates`, `dot_phrases`, `test_runs`) merge by `id` field
- AppDataStore details: see `apps/ts_next_app/CLAUDE.md` → AppDataStore section

### Auth Check (`lib/authCheck.ts`)
- Detects cloud mode without Firebase authentication (logged-out or new user)
- `waitForFirebaseAuth(timeoutMs)` — awaits `onAuthStateChanged` before cloud queries (called in `loadSettings`)
- `checkCloudAuth()` / `notifyCloudAuthRequired()` — shows debounced toast with LOG IN / USE LOCAL / Dismiss buttons
- `notifyTemplateSavedLocally()` — warns when templates saved to local only (cloud auth missing)
- Toast LOG IN button opens `window.openLoginModal()` (global LoginModal component)
- `loginSuccess` DOM event — dispatched by LoginModal on successful auth; RAI listens in `rai.tsx` to reload cloud data

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
- `generateNote()` — **store action** that validates, reviews (@END_TEMPLATE), calls LLM, sets result. Full logic in store.
- `generateAnyway()` — bypasses review, generates directly
- `dismissReview()` — clears review message
- `useNoteGeneration` hook — thin wrapper over store actions (backward compatible)
- `callLLMDirect()` — sends system/user prompts directly without template wrapping (used for analysis)
- Tracked via insightsClient event chains

### Store-Level Composite Actions
- `selectTemplateAndBegin(template)` — resets info + transcript, selects template, navigates to input
- `copyToClipboard(text?)` — clipboard write + `note_copied` event (returns false in automated contexts)
- `switchStorageMode(mode)` — local/cloud switch with migration, toasts, and insight events

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
- List workflows: `window.__rai__.simi.list()` → `['basic_note_flow', 'full_note_flow']`
- Speed control: `{ speed: 5 }` runs 5x faster
- Sessions auto-tagged: `['simi', 'rai', workflow_id, ...workflow.tags]`
- Runner awaits async actions and supports `timeout` on ActionSteps (races promise vs timeout, stops workflow on timeout)
- Existing workflows:
  - `basic_note_flow` — selects first template, adds patient info, navigates to generator (tags: `smoke`, `note_generation`)
  - `full_note_flow` — end-to-end: select template, add info, generate note (LLM call, 120s timeout), assert content, copy to clipboard (tags: `e2e`, `note_generation`, `clipboard`)

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
| `template_review` | `useRaiStore.ts` | `template_id`, `template_name`, `model`, `action`, `message`, `latency_ms` |
| `template_review_response` | `useRaiStore.ts` | `user_action` (`generate_anyway` or `dismissed`), `review_message` |
| `note_copied` | `useRaiStore.ts` | `text` (copied content) |
| `cloud_auth_required` | `authCheck.ts` | `context` (`settings_load`, `save_settings`, `save_templates`) |
| `cloud_auth_action` | `authCheck.ts` | `action` (`switch_to_local`, `dismissed`, `logged_in_via_popup`) |
| `appdata_migrate_to_cloud` | `storage.ts` | `migrated`, `merged`, `skipped`, `failed`, `total_local_keys` |
| `storage_mode_changed` | `useRaiStore.ts` | `mode`, `migrated?`, `merged?`, `skipped?`, `failed?` |
| `storage_mode_change_failed` | `useRaiStore.ts` | `mode`, `error` |

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
- `await window.__rai__.simi.workflows.full_note_flow()` — run full e2e workflow (includes LLM call, ~45s)
- `await window.__rai__.dispatch('generateNote')` — dispatch note generation directly

## Adding Things
- **New view**: update `ViewType` in types.ts, add case in `renderView()`, add route
- **New app setting**: extend `AppSettings` interface, add to `DEFAULT_SETTINGS`, handle migration in `loadSettings`
- **New voice/device setting**: extend `TiviSettings` in `tivi/lib/settings.ts`, add to `TIVI_DEFAULTS`
- **New template variable**: extend `TEMPLATE_SYNTAX` patterns, update prompt builder
- **New insight event**: use `getRaiStore().emitEvent(type, payload)` — auto-tagged with `app_id`
- **New Simi workflow**: create in `simi/workflows/`, export from `simi/index.ts` into `raiWorkflows` — auto-compiled and mounted on bridge
