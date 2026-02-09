# Cortex 0 - Voice-First AI Agent App

## Quick Orientation
- Entry: `page.tsx` → `InsightsProvider` wrapper → dynamic import of `app3.tsx` (SSR disabled)
- Main component: `app3.tsx` — UI state, event wiring, voice pipeline
- State: Zustand store in `store/useCortexStore.ts` via `createInsightStore` — key state lives here
- Agent config: `cortex_agent_web.ts` — function definitions, `get_agent()` / `get_agent_with_mcp()`
- Agent engine: `../src/cortex.ts` — LLM loop, function execution, provider routing (shared code)
- Storage: `lib/storage.ts` — AppDataStore singleton (`getCortexStore()`)
- Auth: `lib/authCheck.ts` — cloud auth detection, toast notifications
- Simi workflows: `simi/` — declarative test workflows
- Full architecture: `cortex_architecture_information.md`

## Key Patterns

### Initialization Order (matters)
1. `InsightsProvider` wraps everything (from `page.tsx`)
2. `app3.tsx` mounts, gets `insightsClient` via `useInsights()`
3. `useCortexStore.setInsights(insightsClient)` — late-binding
4. `store.loadSettings()` — resolves storage backend, runs auth check, shows toast if needed
   - Calls `migrateLegacyLocalStorage()` (idempotent, flag-gated)
   - Calls `getCortexStore(insights, cloudQueryFn)` — creates singleton or upgrades to cloud
   - Emits `cortex_store_init`, `cortex_legacy_migration`, `cortex_settings_loaded`
5. `store.loadConversation()` — restores chat + workspace (if any)
6. `useCortexAgent(ai_model, insightsClient, { isAuthenticated })` — creates Cortex agent with auth context
7. `COR.on('event', handle_event)` — events flow into store actions
8. Window globals exposed (`window.COR`, `window.__cortex_0__`, `window.cortexInsights`)

### Store Architecture (useCortexStore)
- Built with `createInsightStore` — auto-instruments all actions with insight events
- Config: `{ appName: 'cortex_0', silent: ['checkAuth', 'captureExecutionSnapshot'], workflows: cortexWorkflows }`
- **State in store** (persisted or observable): `chatHistory`, `lastAiMessage`, `workspace`, `thoughtHistory`, `logHistory`, `htmlDisplay`, `codeParams`, `contextUsage`, `isAuthenticated`, `aiModel`, `speechCooldownMs`, `soundFeedback`, execution state, `executionHistory`
- **State in app3.tsx useState** (UI-only): `mode`, `drawerOpen`, `settingsOpen`, `voiceStatus`, `chatInput`, `text_input`, `focusedWidget`, `started`, `transcribe`, `globalPause`, `interim_result`
- Auto-save: debounced 2s after `chatHistory`, `workspace`, or settings changes

### Storage (AppDataStore Integration)
- Singleton: `getCortexStore()` in `lib/storage.ts` — scoped to `app_id='cortex_0'`
- Data keys: `settings`, `conversations`, `widget_layout`, `sessions` (defined in `CORTEX_DATA_KEYS`)
- Backend mode: persisted in `__backend_mode__` localStorage flag
- **Default mode: cloud** — new users start in cloud mode so auth check prompts them to log in or switch to local
- `getCortexStore(insights, cloudQueryFn)` handles late `cloudQueryFn` — upgrades via `switchToCloud()` if needed
- `migrateLegacyLocalStorage()` — one-time migration of `cortex_widget_config` / `cortex_widget_layout` keys

### Auth Check (`lib/authCheck.ts`)
- Detects cloud mode without Firebase authentication (logged-out or new user)
- `waitForFirebaseAuth(timeoutMs)` — awaits `onAuthStateChanged` before cloud queries (called in `loadSettings`)
- `checkCloudAuth()` / `notifyCloudAuthRequired()` — debounced toast (30s) with LOG IN / USE LOCAL / Dismiss
- Toast LOG IN button opens `window.openLoginModal()` or falls back to popup sign-in
- Agent receives `authInfo` — system message changes based on login state
- Agent has `check_login_status` function to report auth status to user

### Agent Loop (two paths)

**Reactive path** (voice/chat UI — existing):
```
User input → add_user_message() → chat_history update → useEffect → get_ai_response()
→ COR.run_llm(4) → agent calls functions → user_output callback → add_ai_message()
```

**Dispatch path** (Simi/Playwright — new, replayable):
```
dispatch('sendMessage', content) → addUserMessage + agent.add_user_text_input + agent.run_llm(4)
→ agent calls functions → user_output callback → add_ai_message()
```

- `sendMessage` sets `_llmActive = true` which guards the reactive useEffect from double-firing
- Both paths share the same agent output callback (`add_ai_message` configured via `COR.configure_user_output`)
- `add_ai_message` lives in app3.tsx because it handles speech synthesis (`tivi.speak`) and FPS metrics
- Store holds the agent ref via `setAgent(COR)` — synced in a useEffect when COR changes

### Input Routing
- If `COR.is_running_function` → `COR.handle_function_input(text)` (function-level input)
- Otherwise → `add_user_message(text)` (normal chat)

### Event-Driven Widgets
- Cortex emits events via EventEmitter
- `event_dic` in app3.tsx maps event types to store actions
- 11+ widgets rendered in `DraggableWidgetGrid` with drag/drop/resize
- Presets: focus, development, debug, minimal

### Sandbox (Secure JS Execution)
- `src/IframeSandbox.ts` — iframe-based isolation with proxy membrane
- Persistent iframe reused across executions
- Tracks: function calls, variable assignments, console output
- API: `evaluateJavaScriptSandboxed()`, `resetSandbox()`, `destroySandbox()`

### Execution History
- `executionHistory[]` (max 100 snapshots) — in store, single source of truth
- `selectedIndex = -1` means latest, `0+` means specific execution
- `isPinned` locks view to selected execution
- Snapshot capture handled by `captureExecutionSnapshot()` in store

### Voice Pipeline
```
Microphone → Tivi VAD → Speech Recognition → transcription_cb()
→ input routing → AI response → tivi.speak(content, playbackRate)
```

### Session Save/Load
- `saveSession(label?)` — serializes full state to `sessions` array in AppDataStore (max 50)
- `loadSession(sessionId)` — restores chat, workspace, thoughts, logs, execution history, settings
- `listSessions()` — returns `[{ id, label, timestamp }]`

### Simi (Simulation Workflows)
- Location: `simi/` directory, workflows in `simi/workflows/`
- Wired into store via `workflows: cortexWorkflows` in `createInsightStore` config
- Bridge: `window.__cortex_0__.simi.workflows.NAME(opts?)` — runs workflow, returns `RunResult`
- List workflows: `window.__cortex_0__.simi.list()` → `['basic_chat_flow', 'full_conversation_flow']`
- Speed control: `{ speed: 5 }` runs 5x faster
- Existing workflows:
  - `basic_chat_flow` — sends message, waits for AI response (tags: `smoke`, `chat`)
  - `full_conversation_flow` — multi-turn chat, saves/lists sessions (tags: `e2e`, `chat`, `session`)
  - `settings_persistence_flow` — update → save → overwrite → reload → assert originals (tags: `smoke`, `settings`, `persistence`)
  - `session_save_load_flow` — send message → saveConversation → clearChat → loadConversation → assert restored (tags: `e2e`, `session`, `persistence`)
  - `code_execution_flow` — prompt agent to write + run code → assert codeParams, executionStatus, executionHistory (tags: `e2e`, `code`, `sandbox`, `execution`)
  - `multi_turn_context_flow` — 4-turn conversation verifying context retention across turns (tags: `e2e`, `chat`, `context`)
  - `workspace_update_flow` — prompt agent to store workspace data → assert workspace populated (tags: `e2e`, `workspace`)
  - `html_display_flow` — prompt agent to render HTML → assert htmlDisplay populated (tags: `e2e`, `html`)

## Telemetry (Insight Events)

| Event | Source | Payload |
|-------|--------|---------|
| `cortex_store_init` | `storage.ts` | `bootstrap`, `resolved_mode`, `is_new_instance`, `cloud_upgraded` |
| `cortex_legacy_migration` | `useCortexStore.ts` | `migrated`, `skipped` |
| `cortex_settings_loaded` | `useCortexStore.ts` | `source`, `had_migration`, `raw_stored`, `merged` |
| `cortex_settings_updated` | `useCortexStore.ts` | `changed_keys`, `before`, `after` |
| `cortex_settings_saved` | `useCortexStore.ts` | `ok`, `mode`, `settings` |
| `cortex_conversation_loaded` | `useCortexStore.ts` | `chat_length`, `has_workspace` |
| `cortex_session_saved` | `useCortexStore.ts` | `sessionId`, `label` |
| `cortex_session_loaded` | `useCortexStore.ts` | `sessionId` |
| `cloud_auth_required` | `authCheck.ts` | `context` |
| `cloud_auth_action` | `authCheck.ts` | `action` (`switch_to_local`, `dismissed`, `logged_in_via_popup`) |
| `storage_mode_changed` | `useCortexStore.ts` | `mode`, `migrated?`, `merged?`, `skipped?`, `failed?` |
| `appdata_load/save` | `app_data_store.ts` | `data_key`, `ok`, `mode`, `duration_ms` |
| `simi_workflow_start` | `simi/runner.ts` | `workflow_id`, `app`, `step_count`, `tags` |
| `simi_step` | `simi/runner.ts` | `workflow_id`, `step`, `type`, `duration_ms`, `status` |
| `simi_workflow_complete` | `simi/runner.ts` | `workflow_id`, `total_ms`, `steps_passed`, `steps_failed` |

## Debugging
- `window.COR` — current Cortex agent instance
- `window.workspace` — workspace object (from store)
- `window.tivi` — voice interface
- `window.sandbox` — sandbox module
- `window.tsw` — tidyscripts web library
- `window.cortexInsights` — InsightsClient instance
- `window.__cortex_0__.getState()` — current store snapshot
- `window.__cortex_0__.dispatch('addUserMessage', 'test')` — dispatch action
- `window.__cortex_0__.simi.list()` — list available Simi workflows
- `await window.__cortex_0__.simi.workflows.basic_chat_flow()` — run smoke test
- `await window.__cortex_0__.dispatch('saveSession', 'test-session')` — save session
- `await window.__cortex_0__.dispatch('listSessions')` — list saved sessions
- `bin/save_session cortex_0` — export session data for offline analysis

## Adding Things
- **New widget**: create in `widgets/`, register in `useWidgetConfig.ts`, add layout in `DraggableWidgetGrid.tsx`, render in `app3.tsx`
- **New agent function**: define in `cortex_agent_web.ts`, add to `functions` array with `enabled: true`
- **New event**: emit via `ops.util.event()`, add handler in store (`useCortexStore.ts`), wire in `event_dic` in app3.tsx
- **New store state**: add to `CortexState` interface and `creator` in `useCortexStore.ts`
- **New Simi workflow**: create in `simi/workflows/`, export from `simi/index.ts` into `cortexWorkflows`
- **New data key**: add to `CORTEX_DATA_KEYS` in `lib/storage.ts`, use via `getCortexStore().get/set(key)`
- **New insight event**: use `insights.emit(type, payload)` in store creator, or `getCortexStore().emitEvent(type, payload)`
