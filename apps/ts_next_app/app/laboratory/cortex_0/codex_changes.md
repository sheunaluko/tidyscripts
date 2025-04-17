---
## 2025-04-17
- Created `codex.md` to document the repo overview. (codex.md added)
- Refactored model configuration:
  - Updated `cortex_agent_web.ts` to accept a `modelName` parameter in `get_agent()`. (cortex_agent_web.ts)
  - Overhauled `app3.tsx`:
    - Removed top‑level `COR`, stored agent in React state and re‑instantiated on model change.
    - Extended MUI imports to include `FormControl`, `InputLabel`, `Select`, `MenuItem`.
    - Added a model selector dropdown with options: `gpt-4o`, `gpt-4o-mini-2024-07-18`, `o4-mini`, `chatgpt-4o-latest`.
  (cortex_agent_web.ts, app3.tsx)
---