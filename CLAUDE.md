# Tidyscripts

## Quick Reference
- Type check: `cd apps/ts_next_app && npm run type-check`
- Compile bin/dev scripts: `./bin/crepl`
- Debug session export: `bin/save_session "app_name"` — outputs to `apps/ts_next_app/.session_data/`
- Read session JSONs from `.session_data/` to debug runtime issues
- Run Simi workflow: `await window.__rai__.simi.workflows.full_note_flow()` (browser console)
- Active apps: `rai`, `cortex_0` (under `apps/ts_next_app/app/laboratory/`)

## Session Export (`bin/save_session`)
Must run from repo root (`cd tidyscripts`).

```
bin/save_session <app_name>                          # Export latest session
bin/save_session <app_name> --tag simi,e2e           # Export latest session with matching tags
bin/save_session <app_name> --last 3                 # Export 3 most recent sessions
bin/save_session <app_name> --tag simi --last 5      # Combine: 5 most recent simi-tagged sessions
```

Output: `apps/ts_next_app/.session_data/session_<app>_[<tags>_]<timestamp>.json`

## Debugging Workflow
The insightsClient instruments everything. After the user tests the app:
1. Run `bin/save_session "app_name"` to export session data
2. Read the latest session JSON from `apps/ts_next_app/.session_data/`
3. Use the event timeline, errors, and traces to diagnose and fix issues

Simi workflows tag sessions automatically — filter by `simi` tag in exports (e.g. `bin/save_session rai --tag simi`).

## Architecture Docs (auto-loaded per directory)
- `apps/ts_next_app/CLAUDE.md` — Next.js app, insightsClient, AppDataStore, createInsightStore, Simi
- `apps/ts_next_app/app/laboratory/rai/CLAUDE.md` — RAI app patterns
- `apps/ts_next_app/app/laboratory/cortex_0/CLAUDE.md` — Cortex app patterns
- Detailed architecture: `cortex_0/cortex_architecture_information.md`, `rai/docs/architecture.ts`

## Detailed Reference
See `bin/skills/tidyscripts_dev.md` for full development guide.
