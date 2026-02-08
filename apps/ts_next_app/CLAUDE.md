# ts_next_app (Next.js)

## Commands
- Type check: `npm run type-check` (from this directory)
- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

## InsightsClient (Telemetry & Debugging)
The insightsClient instruments all apps for both production telemetry and debug data.
- Source: `tidyscripts_web` package (`tsw.common.insights.InsightsClient`)
- Key API: `addEvent()`, `startChain()` / `addInChain()` / `endChain()`, `addLLMInvocation()`, `addSessionTags()` / `getSessionTags()`
- React integration: `InsightsProvider` context wrapper + `useInsights()` hook
- All insight calls are optional — `if (insightsClient)` pattern, never breaks the app
- Sessions exported via `bin/save_session "app_name"` → `.session_data/`
- Session tags: `addSessionTags(['tag1', 'tag2'])` — tags emitted as `session_tags` events, captured in exports without server changes

## AppDataStore (Shared Storage)
- Location: `src/lib/app_data_store.ts`
- Abstraction over localStorage / SurrealDB (cloud) with uniform async interface
- Two backends: `LocalStorageBackend` (localStorage with key registry) and `SurrealBackend` (SurrealDB via injected query function)
- Facade: `AppDataStore` class — `get<T>(key)`, `set<T>(key, content)`, `remove(key)`, `list()`, `loadFull()`, `saveFull()`, `migrate(source, dest)`
- Accepts optional `InsightsClient` — auto-tracks `appdata_load`, `appdata_save`, `appdata_remove`, `appdata_list`, `appdata_init`, `appdata_mode_switch`, `appdata_migrate` events
- Public `emitEvent(type, payload)` method lets callers emit scoped insight events through the store
- Backend mode persisted via `appdata::<app_id>::__backend_mode__` localStorage flag
- `switchToCloud(queryFn)` / `switchToLocal()` for runtime backend switching
- `migrate(source, dest)` for cross-backend data migration
- Used by: rai (templates, settings, test history, dot phrases), cortex_0

## createInsightStore (Zustand Factory)
- Location: `src/lib/createInsightStore.ts`
- Wraps Zustand's `create()` to auto-instrument every store action with insight events
- Config: `{ appName, silent?, workflows?, creator }` — `silent` skips instrumentation for noisy actions
- Auto-wraps all function-valued state members; emits `action` events with timing, args, result, status
- Handles both sync and async actions (promise detection)
- **Playwright bridge**: exposes `window.__${appName}__` with `dispatch(actionName, ...args)` and `getState()`
- **Simi integration**: if `workflows` provided, compiles them and mounts on `window.__${appName}__.simi`
- Late-binding: `useStore.setInsights(client)` after React mount
- `InsightHelpers` passed to creator: `emit(type, payload)` and `getClient()`

## Simi (Simulation Interface)
- Location: `src/lib/simi/`
- App-agnostic declarative test workflow system
- Apps define workflows as arrays of steps; Simi compiles them into runnable functions on the Playwright bridge
- Workflows run from browser console (`window.__appName__.simi.workflows.NAME()`) or Playwright
- **Types** (`types.ts`): `SimiWorkflow`, `WorkflowStep` (ActionStep, AssertStep, WaitForStep), `Resolver` (state, find, eval), `RunOpts`, `RunResult`
- **Resolvers** (`resolvers.ts`): `resolveArgs(args, getState)` — replaces `{ $resolve: ... }` objects with runtime values from state
  - `state`: reads dotted path from state
  - `find`: array lookup by index or match (supports regex, nested objects)
  - `eval`: calls function against state
- **Runner** (`runner.ts`): `executeWorkflow(workflow, dispatch, getState, getClient, opts?)` — runs steps, emits telemetry, returns `RunResult`. Awaits async actions (promise detection). Supports `timeout` on ActionSteps — races promise vs timeout, stops workflow on timeout error.
- **Public API** (`index.ts`): `defineWorkflow()` helper, `executeWorkflow`, all type exports
- Wired into stores via `createInsightStore` `workflows` config — auto-compiled and mounted on bridge
- Every step emits telemetry: `simi_workflow_start`, `simi_step`, `simi_resolve`, `simi_workflow_complete`
- Sessions auto-tagged: `['simi', app, workflow_id, ...workflow.tags]`
- Speed multiplier: `{ speed: 5 }` runs 5x faster (adjusts `wait` delays)

### Adding a Simi Workflow
1. Create workflow file: `app/laboratory/<app>/simi/workflows/<name>.ts`
2. Use `defineWorkflow({ id, app, tags?, steps })` for type safety
3. Export from `app/laboratory/<app>/simi/index.ts`
4. Pass to `createInsightStore` via `workflows` config in the store file

## URL Rewrites (App Migration Pattern)

Apps can be exposed under a different URL path without moving source files, using Next.js `rewrites()` in `next.config.mjs`. This keeps all imports intact while changing the user-facing URL.

**Active rewrites:**
| Public URL | Source location | Purpose |
|-|-|-|
| `/apps/rai` | `app/laboratory/rai/` | RAI exposed under App Library |

**To expose another lab app under a new URL:**
1. Add rewrite rules to `next.config.mjs` `rewrites()` (both `/:path*` and bare path)
2. Update the menu entry `href` in `constants/indexMenuItems.ts`
3. Add the new URL to `HIDDEN_PATHS` in `components/IndexSidebar.tsx` if needed
4. Both old and new URLs will work — rewrites are transparent to the browser

**To fully move an app's source folder** (if ever needed):
1. Convert parent-relative imports (`../../..`) to `@/` aliases first — the `@/*` path alias is configured in `tsconfig.json`
2. `git mv` the folder
3. Add a rewrite for the OLD URL so bookmarks/links still work
4. Type-check to catch any broken imports

## Laboratory Apps
Each app under `app/laboratory/` is self-contained. Active apps:
- `rai/` — medical note generation, exposed at `/apps/rai` (see rai/CLAUDE.md)
- `cortex_0/` — voice AI agent with sandboxed execution (see cortex_0/CLAUDE.md)
- Shared code: `app/laboratory/src/` (cortex engine, utilities)
