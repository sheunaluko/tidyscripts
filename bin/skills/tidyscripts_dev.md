# Tidyscripts Development Reference

## Repository Structure

- **Monorepo** with apps under `apps/` and shared packages
- Primary web app: `apps/ts_next_app/` (Next.js)
- Laboratory apps: `apps/ts_next_app/app/laboratory/` — each subdirectory is a standalone app
- Active apps being developed: `rai`, `cortex_0`
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

### Iterative AI Development Loop
1. Claude makes code changes
2. User tests the app in the browser
3. User runs `bin/save_session "app_name"` to capture session data
4. Claude reads the session JSON from `.session_data/` to understand what happened
5. Claude makes fixes based on the session data (errors, traces, event timeline)
6. Repeat

## Instrumentation / InsightsClient

- The `insightsClient` instruments app behavior so session data contains debug information
- Session data includes both production telemetry AND debug-level detail
- Event types include: `appdata_load`, `appdata_save`, LLM calls, errors, traces
- Each event has a timestamp, event_id, event_type, and payload with contextual data

## App Architecture Notes

### RAI App (`apps/ts_next_app/app/laboratory/rai/`)
- Medical note generation tool using AI (TIVI architecture — direct AI calls with review)
- Key directories: `components/`, `hooks/`, `lib/`, `store/`
- State management via zustand (`store/useRaiStore.ts`)
- Template-based note generation with voice and text input modes
- Settings include: AI model selection, TIVI mode (guarded/unguarded), storage mode (local/cloud)

### Cortex 0 (`apps/ts_next_app/app/laboratory/cortex_0/`)
- Another active app under development

## File Conventions
- React components in `components/` subdirectories
- Custom hooks in `hooks/`
- Business logic / utilities in `lib/`
- Types in `types.ts`
- Constants in `constants.ts`
