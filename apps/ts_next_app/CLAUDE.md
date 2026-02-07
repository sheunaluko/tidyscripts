# ts_next_app (Next.js)

## Commands
- Type check: `npm run type-check` (from this directory)
- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

## InsightsClient (Telemetry & Debugging)
The insightsClient instruments all apps for both production telemetry and debug data.
- Source: `tidyscripts_web` package (`tsw.common.insights.InsightsClient`)
- Key API: `addEvent()`, `startChain()` / `addInChain()` / `endChain()`, `addLLMInvocation()`
- React integration: `InsightsProvider` context wrapper + `useInsights()` hook
- All insight calls are optional — `if (insightsClient)` pattern, never breaks the app
- Sessions exported via `bin/save_session "app_name"` → `.session_data/`

## AppDataStore (Shared Storage)
- Location: `src/lib/app_data_store.ts`
- Abstraction over localStorage / SurrealDB (cloud)
- Accepts optional `InsightsClient` — auto-tracks load/save events
- Public `emitEvent(type, payload)` method lets callers emit scoped insight events through the store
- Backend mode persisted via `appdata::<app_id>::__backend_mode__` localStorage flag
- `switchToCloud(queryFn)` / `switchToLocal()` for runtime backend switching
- `migrate(source, dest)` for cross-backend data migration
- Used by: rai (templates, settings, test history), cortex_0

## Laboratory Apps
Each app under `app/laboratory/` is self-contained. Active apps:
- `rai/` — medical note generation (see rai/CLAUDE.md)
- `cortex_0/` — voice AI agent with sandboxed execution (see cortex_0/CLAUDE.md)
- Shared code: `app/laboratory/src/` (cortex engine, utilities)
