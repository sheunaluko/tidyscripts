# Cortex 0 - Voice-First AI Agent App

## Quick Orientation
- Entry: `page.tsx` → dynamic import of `app3.tsx` (SSR disabled)
- Main component: `app3.tsx` (~1,800 lines) — all UI state and event handling
- Agent config: `cortex_agent_web.ts` — function definitions, `get_agent()` / `get_agent_with_mcp()`
- Agent engine: `../src/cortex.ts` — LLM loop, function execution, provider routing (shared code)
- Full architecture: `cortex_architecture_information.md`

## Key Patterns

### Agent Loop
```
User input → chat_history update → useEffect → get_ai_response()
→ COR.run_llm(4) → function calls executed → results fed back → loop until no more calls
```

### Input Routing
- If `COR.is_running_function` → `COR.handle_function_input(text)` (function-level input)
- Otherwise → `add_user_message(text)` (normal chat)

### Event-Driven Widgets
- Cortex emits events via EventEmitter
- `event_dic` in app3.tsx maps event types to state setters
- 11+ widgets rendered in `DraggableWidgetGrid` with drag/drop/resize
- Presets: focus, development, debug, minimal

### Sandbox (Secure JS Execution)
- `src/IframeSandbox.ts` — iframe-based isolation with proxy membrane
- Persistent iframe reused across executions
- Tracks: function calls, variable assignments, console output
- API: `evaluateJavaScriptSandboxed()`, `resetSandbox()`, `destroySandbox()`

### Execution History
- `executionHistory[]` (max 100 snapshots) — single source of truth
- `selectedIndex = -1` means latest, `0+` means specific execution
- `isPinned` locks view to selected execution
- Widget data derived from `currentExecution` (memoized)

### Voice Pipeline
```
Microphone → Tivi VAD → Speech Recognition → transcription_cb()
→ input routing → AI response → tivi.speak(content, playbackRate)
```

## Debugging
- `window.COR` — current Cortex agent instance
- `window.workspace` — mutable workspace object
- `window.tivi` — voice interface
- `window.sandbox` — sandbox module
- `window.tsw` — tidyscripts web library
- `bin/save_session cortex_0` — export session data

### Simi (Simulation Workflows)
- Simi is available for Cortex via `createInsightStore` — add `workflows` to the store config
- Define workflows in `simi/workflows/`, export from `simi/index.ts`
- Bridge: `window.__cortex_0__.simi.workflows.NAME(opts?)` (once workflows are added)
- See `apps/ts_next_app/CLAUDE.md` → Simi section for full details

## Adding Things
- **New widget**: create in `widgets/`, register in `useWidgetConfig.ts`, add layout in `DraggableWidgetGrid.tsx`, render in `app3.tsx`
- **New agent function**: define in `cortex_agent_web.ts`, wrap with `wrap_function()`, register in `get_agent()`
- **New event**: emit via `ops.util.event()`, add handler in `event_dic` in app3.tsx
- **New Simi workflow**: create `simi/workflows/` directory, define workflows with `defineWorkflow()`, pass to store config
