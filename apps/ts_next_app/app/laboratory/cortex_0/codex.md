This file provides a high‑level summary of the Cortex Directory codebase to speed up future onboarding.

1. Page entry point
- `page.tsx` re‑exports `app3.tsx` as the main Cortex UI.
- `app.tsx` and `app2.tsx` are earlier/demo versions (audio viz, Chakra vs MUI, simpler chat).

2. Main UI (`app3.tsx`)
- Instantiates a Cortex agent (`get_agent()`) wrapping an OpenAI model + function schema.
- React state for chat history, AI “thoughts,” debug/log lines, JS "workspace", last AI message, STT interim results, code & HTML snippets, TTS playback rate, widget focus/fullscreen.
- STT callback dispatches transcripts into either:
  - `COR.handle_function_input(...)` if a function is running
  - otherwise pushes a user message → `COR.run_llm()` → assistant reply + events.
- Listens for Cortex "events":
  - `thought` → Thoughts widget
  - `log` → Log widget
  - `workspace_update` → Workspace inspector
  - `code_update` → Code editor (ACE)
  - `html_update` → HTML renderer
- Layout: MUI Grid of six widgets (Chat, Workspace, Thoughts, Log, Code, HTML) with fullscreen toggles.
- "Tools" panel: manual text input, toggle listen‑while‑speaking, TTS rate slider, stop button to interrupt speech.
- Bokeh visualizations for mic/tts waveforms and scatter plots.

3. Agent glue (`cortex_agent_web.ts`)
- `get_agent()` creates `new c.Cortex({ model, name, functions, … })`.
- Defines an array of "functions" the LLM can call: bash commands, JS eval, display_code/html, update_workspace, firebase logs, YouTube summary, text accumulation, etc.
- Executes function calls in the frontend, feeds results and side‑effects back via events.

4. UI components
- **CodeWidget.tsx** — ACE editor for code snippets.
- **HTMLWidget.tsx** — Renders HTML via `innerHTML`.
- **WidgetItem.tsx** — Card wrapper with title, expand/close controls.
- **voice_chat.tsx** — Standalone chat component hitting a Vercel API.

5. Utilities
- **fn_utils.ts** — Text tokenizer with newline tokens, punctuation removal.
- **src/cortex_utils.ts** — String similarity (Jaro–Winkler + substring override) to filter out self‑transcribed audio.

6. Dependencies
- `tidyscripts_web`: audio/STT/TTS, DOM helpers, functional utils.
- MUI (and older Chakra) for UI.
- Bokeh for live plotting.
- Firebase utils (`src/firebase[_utils]`) for persistent storage & practice questions.



---
For a chronological log of incremental changes across sessions, see `codex_changes.md`.