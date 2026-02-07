export const id = 'architecture';
export const title = 'Architecture';
export const order = 4;

export const content = `
## App Architecture

R.AI is a Next.js client-side application built with React, Material UI, and Zustand for state management.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router, client components) |
| UI | Material UI v6 |
| State | Zustand (single store: \`useRaiStore\`) |
| Routing | Hash-based (\`useHashRouter\` + \`router.ts\`) |
| Storage | AppDataStore (localStorage / SurrealDB) |
| Voice | TIVI (Tidyscripts Voice Interface) |
| AI | Multi-provider LLM (Anthropic, Google, OpenAI) |
| Telemetry | InsightsClient (event chains, session export) |

### Directory Structure

\`\`\`
app/laboratory/rai/
  rai.tsx                    # Main component, view router
  types.ts                   # TypeScript type definitions
  constants.ts               # Theme config, constants
  docs/                      # Documentation modules (this manual)
  components/
    Layout/                  # MainLayout, Sidebar
    TemplatePicker/          # Template selection
    InformationInput/        # Voice/text input
    NoteGenerator/           # Note generation + editing
    TemplateEditor/          # Template CRUD
    Settings/                # App settings
    TestInterface/           # Model comparison testing
    Manual/                  # Documentation viewer
  hooks/
    useHashRouter.ts         # URL hash sync
    useVoiceAgent.ts         # Voice agent integration
  lib/
    router.ts                # Route parsing + generation
    templateParser.ts        # Template variable extraction
    noteGenerator.ts         # LLM note generation
    testRunner.ts            # Multi-model test runner
    storage.ts               # AppDataStore RAI integration
    app_data_store.ts        # Storage abstraction (in src/lib/)
    test_app_data_store.ts   # Storage test suite
  store/
    useRaiStore.ts           # Zustand store (single source of truth)
  context/
    InsightsContext.tsx       # Telemetry provider
\`\`\`

### State Management

All app state lives in a single Zustand store (\`useRaiStore\`). Key state domains:

- **Navigation** — current view, routing
- **Templates** — loaded templates, selection, editor state
- **Information** — collected clinical entries, voice transcript
- **Note Generation** — generated note, loading state, checkpoints
- **Settings** — all app preferences
- **Test Interface** — test runs, model comparison results

### Routing

The app uses hash-based routing for deep linking:

| Hash | View |
|------|------|
| \`#templates\` | Template Picker |
| \`#input\` | Information Input |
| \`#generator\` | Note Generator |
| \`#templates/edit\` | Template Editor (list) |
| \`#templates/create\` | Template Editor (create) |
| \`#templates/edit/:id\` | Template Editor (edit) |
| \`#test\` | Test Interface |
| \`#test/run/:runId\` | Test Interface (specific run) |
| \`#settings\` | Settings |
| \`#manual\` | Manual |

Navigation is bi-directional: clicking sidebar items updates the hash, and browser back/forward triggers view changes.

### Storage System

The app uses AppDataStore (\`src/lib/app_data_store.ts\`) for persistent storage, integrated via a singleton in \`lib/storage.ts\`.

| Concept | Details |
|---------|---------|
| Singleton | \`getRaiStore()\` — scoped to \`app_id='rai'\` |
| Data keys | \`settings\`, \`custom_templates\`, \`test_runs\`, \`dot_phrases\` |
| Backends | localStorage (local) / SurrealDB (cloud) |
| Mode flag | \`appdata::rai::__backend_mode__\` in localStorage |
| Switching | \`switchToCloud(queryFn)\` / \`switchToLocal()\` at runtime |

**Initialization flow:**
1. \`bootstrapBackendModeFlag()\` — detects cloud users from stored settings
2. \`getRaiStore(insights, queryFn)\` — creates singleton or upgrades to cloud if needed
3. \`migrateLegacyLocalStorage()\` — one-time migration from old \`rai_*\` keys (idempotent)
4. Settings loaded first, then templates/test history/dot phrases in parallel

### LLM Integration

Two LLM calling functions in \`lib/noteGenerator.ts\`:

- **\`generateNote()\`** — Wraps prompts in template-filling instructions via \`buildNotePrompt()\`. Used for note generation.
- **\`callLLMDirect()\`** — Sends system/user prompts directly without template wrapping. Used for analysis and non-note tasks.

Both use structured output (Zod schema), multi-provider routing, and retry with exponential backoff.

### Telemetry System

The InsightsClient provides event-chain-based telemetry:

1. **\`startChain(type, payload)\`** — Begin a chain (e.g., note generation)
2. **\`addInChain(type, payload)\`** — Add events within the chain
3. **\`endChain()\`** — Close the chain
4. **\`addEvent(type, payload)\`** — Standalone events
5. **\`getRaiStore().emitEvent(type, payload)\`** — Emit scoped events through AppDataStore

Key events emitted in session exports:

| Event | Description |
|-------|-------------|
| \`rai_store_init\` | Store creation/upgrade with bootstrap result and resolved mode |
| \`rai_legacy_migration\` | Legacy key migration result (migrated/skipped counts) |
| \`rai_settings_loaded\` | Settings load with source, migration status, raw + merged data |
| \`rai_settings_updated\` | User setting change with changed keys, full before/after |
| \`rai_settings_saved\` | Save result with ok status, mode, and full settings |
| \`appdata_load/save\` | Low-level storage operations with key, mode, duration, content |

Sessions can be exported via \`bin/save_session rai\` for offline analysis.

### Console Debugging

The following utilities are available on \`window\` for debugging:

| Command | Description |
|---------|-------------|
| \`window.tsw\` | Tidyscripts web library |
| \`window.raiStore\` | Zustand store reference |
| \`window.getRaiState()\` | Current store state snapshot |
| \`window.raiInsights\` | InsightsClient instance |
| \`await window.test_app_data_store()\` | Run storage test suite (34 tests) |
| \`await window.clear_app_data_store_test()\` | Clean up test data |
`;
