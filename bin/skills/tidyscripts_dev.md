# Tidyscripts Development Reference

## Repository Structure

- **Monorepo** with apps under `apps/` and shared packages
- Primary web app: `apps/ts_next_app/` (Next.js)
- Laboratory apps: `apps/ts_next_app/app/laboratory/` — each subdirectory is a standalone app
- Active apps being developed: `rai`, `cortex_0`
- Shared libraries: `src/lib/` — `createInsightStore.ts`, `app_data_store.ts`, `simi/`
- Utility scripts: `bin/`

## Key Commands

### Type Checking
```bash
cd apps/ts_next_app && npm run type-check
```
Run this to verify no TypeScript errors before committing or after significant changes.

### Session Export (Debugging Workflow)
```bash
bin/save_session "app_name"
```
- Exports the most recent session from the insightsClient to `apps/ts_next_app/.session_data/`
- Output file: `session_{app_name}_{timestamp}.json`
- The session JSON contains: session metadata, event timeline, LLM invocations, errors, traces, and telemetry
- Read the exported JSON directly to debug issues
- Session tags (from `addSessionTags()`) appear as `session_tags` events — filter by tag to find Simi runs, etc.

### Iterative AI Development Loop
1. Claude makes code changes
2. User tests the app in the browser
3. User runs `bin/save_session "app_name"` to capture session data
4. Claude reads the session JSON from `.session_data/` to understand what happened
5. Claude makes fixes based on the session data (errors, traces, event timeline)
6. Repeat

### Simi Workflows (Automated Testing)
```bash
# In browser console:
window.__rai__.simi.list()                                     # List workflows
await window.__rai__.simi.workflows.basic_note_flow()          # Run workflow
await window.__rai__.simi.workflows.basic_note_flow({speed:5}) # Run fast
```
- Simi workflows auto-tag sessions — export with `bin/save_session` and look for `simi_*` events
- Workflows run the same from console and Playwright

## Instrumentation / InsightsClient

- The `insightsClient` instruments app behavior so session data contains debug information
- Session data includes both production telemetry AND debug-level detail
- Event types include: `appdata_load`, `appdata_save`, LLM calls, errors, traces, `simi_*` events
- Each event has a timestamp, event_id, event_type, and payload with contextual data
- Session tags: `addSessionTags(['tag1'])` — tags emitted as events, no server changes needed

## Core Libraries (`src/lib/`)

### createInsightStore (`createInsightStore.ts`)
- Zustand factory wrapping `create()` with auto-instrumentation
- Every store action emits `action` events with timing, args, result, status
- Playwright bridge: `window.__${appName}__` with `dispatch()`, `getState()`, and `simi` (if workflows provided)
- Config: `{ appName, silent?, workflows?, creator }`

### AppDataStore (`app_data_store.ts`)
- Storage abstraction over localStorage / SurrealDB with uniform async interface
- Two backends: `LocalStorageBackend`, `SurrealBackend` (via injected query function)
- Facade API: `get(key)`, `set(key, content)`, `remove(key)`, `list()`, `migrate(source, dest)`
- Runtime backend switching: `switchToCloud(queryFn)` / `switchToLocal()`
- Built-in insights telemetry for all operations
- Mode flag: `appdata::<app_id>::__backend_mode__` in localStorage

### Simi (`simi/`)
- App-agnostic declarative test workflow system
- Workflows: arrays of steps (ActionStep, AssertStep, WaitForStep) with resolvers for runtime state
- Compiled by `createInsightStore` and mounted on the Playwright bridge
- Full telemetry: `simi_workflow_start`, `simi_step`, `simi_resolve`, `simi_workflow_complete`
- Adding workflows: create in `<app>/simi/workflows/`, export from `<app>/simi/index.ts`, pass to store config

## App Architecture Notes

### RAI App (`apps/ts_next_app/app/laboratory/rai/`)
- Medical note generation tool using AI (TIVI architecture — direct AI calls with review)
- Key directories: `components/`, `hooks/`, `lib/`, `store/`, `simi/`
- State management via zustand (`store/useRaiStore.ts`) powered by `createInsightStore`
- Template-based note generation with voice and text input modes
- Settings include: AI model selection, TIVI mode (guarded/unguarded), storage mode (local/cloud)
- Storage via AppDataStore singleton (`lib/storage.ts`) — supports local and cloud backends
- Simi workflows in `simi/` — `basic_note_flow` (smoke test)

### Cortex 0 (`apps/ts_next_app/app/laboratory/cortex_0/`)
- Voice-first AI agent with sandboxed JS execution and widget system
- Can add Simi workflows via `createInsightStore` `workflows` config

## File Conventions
- React components in `components/` subdirectories
- Custom hooks in `hooks/`
- Business logic / utilities in `lib/`
- Simulation workflows in `simi/`
- Types in `types.ts`
- Constants in `constants.ts`
