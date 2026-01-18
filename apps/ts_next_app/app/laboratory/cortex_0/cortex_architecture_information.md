# Cortex Voice Agent Application - Architecture Documentation

## Overview

Cortex is a voice-first AI agent application built with Next.js that features real-time conversational AI with secure JavaScript sandboxed code execution and modular widget-based visualization. The system manages an AI agent loop with observability tracking and dynamic function execution.

## Directory Structure

```
cortex_0/
├── page.tsx                          # Next.js page entry point
├── app3.tsx                          # Main application component (1,280+ lines)
├── cortex_agent_web.ts              # Agent configuration & built-in functions
├── disabled_functions.ts             # Reference implementations
├── WidgetItem.tsx                   # Base widget wrapper component
├── types/
│   └── execution.ts                 # Type definitions for execution history
├── hooks/
│   ├── useCortexAgent.ts            # Agent initialization hook
│   └── useWidgetConfig.ts           # Widget persistence & presets
├── widgets/                          # 12 modular visualization components
│   ├── ChatWidget.tsx
│   ├── ThoughtsWidget.tsx
│   ├── LogWidget.tsx
│   ├── CodeWidget.tsx
│   ├── HTMLWidget.tsx
│   ├── WorkspaceWidget.tsx
│   ├── ChatInputWidget.tsx
│   ├── CodeExecutionWidget.tsx      # Current/historical code execution
│   ├── FunctionCallsWidget.tsx      # Function call tracking
│   ├── VariableInspectorWidget.tsx  # Variable assignment tracking
│   ├── SandboxLogsWidget.tsx        # Console output tracking
│   └── HistoryWidget.tsx            # Execution history timeline (NEW)
├── components/
│   ├── TopBar.tsx                   # Control interface
│   ├── SettingsPanel.tsx            # Configuration UI
│   ├── DraggableWidgetGrid.tsx      # Layout management
│   ├── VoiceStatusIndicator.tsx
│   └── AudioVisualization.tsx
├── src/
│   ├── IframeSandbox.ts             # Secure JavaScript sandbox (708 lines)
│   ├── sandbox.ts                   # Sandbox wrapper API (269 lines)
│   └── onnx.ts
└── mcp_adapter.ts                   # MCP server integration
```

**Core Implementation Library:**
- `/app/laboratory/src/cortex.ts` - Main Cortex AI engine (1,169 lines)

## 1. AI Agent Loop Management

### Agent Initialization

**File:** `cortex_agent_web.ts`

```typescript
get_agent(modelName: string) → Cortex instance
get_agent_with_mcp(modelName: string) → Cortex with MCP functions
```

### Cortex Engine Architecture

**File:** `/app/laboratory/src/cortex.ts`

**Core Type Definitions:**
```typescript
FunctionCall: { name: string, parameters: Record<string, any> }
FunctionResult: { name: string, error: boolean, result: any, events?: ObservabilityEvent[] }
CortexOutput: { thoughts: string, calls: FunctionCall[], return_indices?: number[] }
CodeOutput: { thoughts: string, code: string }
```

**Supported LLM Providers:**
- **OpenAI:** `gpt-5-mini`, `gpt-4o-mini-*`
- **Anthropic:** `claude-sonnet-4-5-*`
- **Google Gemini:** `gemini-3-flash-preview`, `gemini-3-pro-preview`

**Key Methods:**
- `run_llm(iterations)` - Main inference loop with function call handling
- `add_user_text_input(text)` - Routes user input to chat history
- `handle_function_input(text)` - Routes transcribed text to active function channels
- `is_running_function` - Boolean flag for function execution state

### Agent Loop Flow

```
1. User message added to chat history
2. Triggers LLM invocation with system prompt + chat context
3. LLM returns structured output with function calls
4. Each function call executed with observability tracking
5. Results injected back into chat for next iteration
6. Loop continues until terminal state (no new function calls)
```

## 2. JavaScript Sandboxed Execution System

### Architecture: Iframe-Based Secure Sandbox

**File:** `src/IframeSandbox.ts` (708 lines)

### Initialization
- Creates hidden `<iframe sandbox="allow-scripts">` element
- Persistent iframe reused across multiple executions
- One-time setup for performance

### Execution Flow

```
User Code
  ↓
[srcdoc HTML injection with execution wrapper]
  ↓
Iframe execution context (isolated window)
  ↓
postMessage ↔ Parent communication
  ↓
Results + Logs + Events returned
```

### Key Features

**Isolation:**
- No access to DOM, localStorage, cookies, fetch, or parent APIs
- Communication via postMessage protocol
- Context injection with primitives serialized
- Functions wrapped for cross-origin calls

**Timeouts:**
- 1-hour default, configurable per execution

**Observability:**
```typescript
interface IframeSandboxResult {
  ok: boolean
  data?: T
  error?: string
  executionId: string
  logs: SandboxLog[]          // Captured console output
  events: SandboxEvent[]      // Function calls, variables, property access
  duration?: number
}
```

### Membrane Pattern (Proxy Wrapper)

- Tracks all property access, function calls, variable assignments
- `has()` trap returns true for all props (enables variable tracking)
- `get()` wrapper emits events for observability
- `set()` trap captures variable assignments

**Available Built-ins:**
- **Safe:** Math, JSON, Array, Object, String, Number, Boolean, Date, RegExp, Error, Promise
- **Async:** setTimeout, setInterval, clearTimeout, clearInterval
- **Special:** eval (for dynamic function execution)
- **Functions:** All context-provided functions accessible via membrane

### Sandbox Wrapper API

**File:** `src/sandbox.ts` (269 lines)

```typescript
initializeSandbox()                                    // One-time warm-up
evaluateJavaScriptSandboxed(code, options)            // Execute code
updateWorkspaceSandboxed(code, workspace)             // Update workspace object
resetSandbox()                                         // Clear all variables, keep iframe alive
destroySandbox()                                       // Remove iframe completely
```

## 3. Widget Visualization System

### Architecture

- **12 Widgets:** Each modular, independently managed
- **State Management:** Widget config persisted in localStorage
- **Layout:** React Grid Layout with drag/drop/resize
- **Fullscreen Mode:** Click to expand any widget to fullscreen
- **Execution History:** Index-based architecture tracks all past executions

### Widget Types

| Widget | File | Purpose | Data Flow |
|--------|------|---------|-----------|
| **Chat** | ChatWidget.tsx | Message display | `chat_history` array |
| **Thoughts** | ThoughtsWidget.tsx | Agent reasoning | `thought_history` array |
| **Log** | LogWidget.tsx | System logging | `log_history` array |
| **Code** | CodeWidget.tsx | Display generated code | `code_params: {code, mode}` |
| **HTML** | HTMLWidget.tsx | Render HTML output | `html_display` string |
| **Workspace** | WorkspaceWidget.tsx | Object inspector | `workspace` object (live updates) |
| **Chat Input** | ChatInputWidget.tsx | Text/voice input | Calls `transcription_cb()` |
| **Code Execution** | CodeExecutionWidget.tsx | Show running code | `currentExecution?.code \|\| currentCode` |
| **Function Calls** | FunctionCallsWidget.tsx | Track function invocations | `currentExecution?.functionCalls \|\| functionCalls[]` |
| **Variable Inspector** | VariableInspectorWidget.tsx | Track assignments | `currentExecution?.variableAssignments \|\| variableAssignments[]` |
| **Sandbox Logs** | SandboxLogsWidget.tsx | Capture console output | `currentExecution?.sandboxLogs \|\| sandboxLogs[]` |
| **Execution History** | HistoryWidget.tsx | Timeline of past executions | `executionHistory[]`, `selectedIndex`, `isPinned` |

### Widget Configuration Hook

**File:** `hooks/useWidgetConfig.ts`

```typescript
{
  widgets: WidgetConfig[]              // All available widgets
  visibleWidgets: WidgetConfig[]       // Filtered to visible only
  toggleWidget(id)                     // Toggle visibility
  widgetLayout: WidgetGridConfig[]     // Current grid positions
  saveLayout(layout)                   // Persist layout to localStorage
  resetLayout()                        // Clear custom layout
  applyPreset(name)                    // Apply preset
}
```

### Layout Presets

- **focus:** Single large chat widget
- **development:** Chat + Code side-by-side + Workspace below
- **debug:** 3×4 grid with execution, function calls, logs, variables
- **minimal:** Chat + Thoughts only

### Execution History System

**File:** `types/execution.ts`

The execution history system provides time-travel debugging and replay capabilities for all code executions.

**Type Definitions:**
```typescript
interface ExecutionSnapshot {
  executionId: string
  timestamp: number
  code: string
  status: 'success' | 'error'
  error?: string
  duration: number
  functionCalls: FunctionCallEvent[]
  variableAssignments: VariableAssignment[]
  sandboxLogs: SandboxLog[]
}
```

**Architecture: Index-Based History**

```typescript
// State variables in app3.tsx
executionHistory: ExecutionSnapshot[]    // Single source of truth (max 100)
selectedIndex: number                     // -1 = latest, >= 0 = specific execution
isPinned: boolean                         // Lock to selection vs auto-advance
```

**Key Principle:**
- `executionHistory` array is the single source of truth
- Widget data is **derived** from `executionHistory[selectedIndex]`
- Live execution state only used during active execution
- Once complete, snapshot captured and widgets switch to historical view

**Behavior Modes:**

1. **Unpinned (default):**
   - `selectedIndex = -1` (always show latest)
   - New execution completes → auto-advance to latest
   - Clicking history item → view it temporarily
   - Next execution → auto-advance back to latest

2. **Pinned:**
   - `selectedIndex = specific index` (e.g., 5)
   - New execution completes → stay on selected execution
   - Widgets locked to historical data
   - Must unpin to see latest

**Derived State:**
```typescript
currentExecution = useMemo(() => {
  if (selectedIndex === -1) return executionHistory[executionHistory.length - 1]
  return executionHistory[selectedIndex]
}, [executionHistory, selectedIndex])
```

**History Widget Features:**
- **Layout Toggle:** Vertical (up/down) vs Horizontal (left/right) scroll
- **Size Slider:** Adjust card dimensions (100-400px)
- **Expandable Cards:** Click to show code preview, stats, error messages
- **Selection Sync:** Click execution → syncs Code Execution, Function Calls, Variables, Logs widgets
- **Auto-Scroll:** Automatically scrolls to selected execution
- **Status Icons:** Success (✓) vs Error (✗) indicators

**Memory Management:**
- Captures snapshot on execution completion (success or error)
- Automatically limits to last 100 executions
- Deep clones data to prevent mutations

### Event System

**Events Emitted from Cortex Engine:**
- `'thought'` - Agent reasoning step
- `'workspace_update'` - Workspace object changed
- `'log'` - System log message
- `'code_update'` - Code display updated
- `'html_update'` - HTML output updated
- `'code_execution_start'` - Code execution began
- `'sandbox_log'` - Console output from sandbox
- `'sandbox_event'` - Variable/function tracking event

**Event Handlers:** Located in `app3.tsx`, route to appropriate widget state setters

## 4. Main Application Component

**File:** `app3.tsx` (1,280+ lines)

### State Management

**30+ useState hooks for UI and agent state:**

```typescript
// Core UI State
mode: 'voice' | 'chat'           // Input mode toggle
started: boolean                 // Audio listening active
chat_history: ChatMessage[]      // Conversation messages
thought_history: string[]        // Agent thoughts
log_history: string[]            // System logs
last_ai_message: string          // Latest response
interim_result: string           // Live transcription
code_params: {code, mode}        // Displayed code
html_display: string             // Rendered HTML
workspace: Record<string, any>   // Mutable workspace object
ai_model: string                 // Selected LLM model

// Live Execution State (during active execution)
currentCode: string              // Code being executed
executionId: string              // Unique execution ID
executionStatus: 'idle' | 'running' | 'success' | 'error'
executionError: string           // Error message if failed
executionDuration: number        // Execution time in ms
functionCalls: FunctionCallEvent[]        // Function invocations
variableAssignments: VariableAssignment[] // Variable tracking
sandboxLogs: SandboxLog[]                 // Console output

// Execution History State
executionHistory: ExecutionSnapshot[]  // All past executions (max 100)
selectedIndex: number                  // Current view index (-1 = latest)
isPinned: boolean                      // Lock to selected execution
```

**Derived State:**
```typescript
currentExecution: ExecutionSnapshot | null  // Computed from history + selectedIndex
```

### Hooks Used

1. **useCortexAgent** - Initializes Cortex agent, handles model changes
2. **useWidgetConfig** - Widget visibility and layout persistence
3. **useTivi** - Voice input/output via tidyscripts_web library

### Voice/Audio Pipeline

```
Microphone Audio
  ↓
[Tivi VAD Detection] (Voice Activity Detection)
  ↓
[Speech Recognition] (Web Speech API / tidyscripts)
  ↓
transcription_cb(text)
  ↓
{
  if (COR.is_running_function)
    → COR.handle_function_input(text)  // For function-level input
  else
    → add_user_message(text)           // For normal chat
}
  ↓
Triggers chat_history update
  ↓
useEffect watches chat_history → calls get_ai_response()
  ↓
LLM inference + function execution
  ↓
AI response displayed + spoken via tivi.speak()
```

## 5. Built-in Agent Functions

**File:** `cortex_agent_web.ts`

### Core Functions

- `format_string(template, args)` - String interpolation
- `respond_to_user(response)` - Output to user
- `console_log(data)` - Debug logging
- `initialize()` - Database initialization

### Display Functions

- `display_code(code, language)` - Show syntax-highlighted code
- `display_html(html)` - Render HTML
- `update_workspace(code)` - Execute code against workspace object

### Data Functions

- `compute_embedding(text)` - Get vector embedding
- `access_database_with_surreal_ql(query)` - Database queries
- `store_declarative_knowledge(knowledge)` - Knowledge graph storage
- `retrieve_declarative_knowledge(query)` - Knowledge graph retrieval

### Dynamic Functions (Stored in Database)

- `create_dynamic_function(name, description, code, params_schema)`
- `load_dynamic_function(name)`
- `list_dynamic_functions()`
- `update_dynamic_function(name, ...)`
- `delete_dynamic_function(name)`

### Sandbox Functions

- `reset_sandbox()` - Clear environment
- `evaluate_javascript(code)` [currently disabled]

### Advanced Functions

- `accumulate_text(instructions)` - Multi-turn text collection
- `array_nth_value(array, index)` - Array access

## 6. MCP Integration

**File:** `mcp_adapter.ts`

- Connects to MCP servers via HTTP transport
- Dynamically discovers tools from MCP server
- Converts MCP tools to Cortex function format
- Usage: `get_agent_with_mcp()` loads from MCP server at `http://localhost:8003/mcp`

## 7. Configuration & Settings

### Model Selection

**Location:** TopBar component

- Dropdown to switch between providers
- Agent re-initializes on model change
- Default: `gemini-3-flash-preview`
- Also tested: `gpt-4o-mini`, `claude-sonnet-4-5`

### Audio Settings

**Location:** SettingsPanel component

```typescript
positiveSpeechThreshold: 0.8       // Voice detection sensitivity
negativeSpeechThreshold: 0.6       // Non-speech threshold
minSpeechMs: 500                   // Minimum speech duration
language: 'en-US'                  // Speech recognition language
playbackRate: 1.2                  // TTS playback speed (adjustable via slider)
```

### Widget Configuration

- **Widget Config:** Saved to `localStorage.cortex_widget_config`
- **Layout:** Saved to `localStorage.cortex_widget_layout`
- **Presets:** Applied for different workflows (focus, development, debug, minimal)

### Global Window Objects

```typescript
window.COR         // Current Cortex agent instance
window.workspace   // Mutable object for agent code execution
window.tivi        // Voice interface
window.tsw         // tidyscripts_web library
window.sandbox     // Sandbox module access
```

## 8. Complete Data Flow

### Full Conversation Flow

```
1. USER PROVIDES INPUT
   ├─ Voice Mode: Microphone → Tivi VAD → Speech Recognition → Transcript
   └─ Chat Mode: Text Field → Manual input

2. INPUT ROUTING
   ├─ If function executing: → COR.handle_function_input()
   └─ Otherwise: → add_user_message() → chat_history update

3. EFFECT TRIGGERS
   └─ useEffect watches chat_history → calls get_ai_response()

4. LLM INVOCATION
   ├─ Provider detected (OpenAI/Anthropic/Gemini)
   ├─ Endpoint selected
   ├─ Chat context + system prompt sent
   └─ Structured output requested (CortexOutput schema)

5. LLM RESPONSE PARSING
   ├─ Extract thoughts → emit 'thought' event
   ├─ Extract function calls → queue for execution
   └─ Parse return indices

6. FUNCTION EXECUTION LOOP
   For each FunctionCall:
   ├─ Build function context
   ├─ Execute function fn() with params
   ├─ Capture result + error
   ├─ Special handling:
   │  ├─ display_code() → emit 'code_update' event
   │  ├─ display_html() → emit 'html_update' event
   │  ├─ update_workspace() → evaluate in sandbox → emit 'workspace_update'
   │  └─ respond_to_user() → add_ai_message() immediately
   └─ Return result to LLM

7. UI UPDATES (Real-time)
   ├─ Events route to widget state handlers
   ├─ Chat widget updates chat_history
   ├─ Code widget updates code_params
   ├─ Workspace widget shows live changes
   └─ Execution widget tracks current operation

8. VOICE OUTPUT (Voice Mode)
   ├─ if mode !== 'chat'
   ├─ Generate speech from response text (OpenAI TTS)
   ├─ Apply playbackRate
   └─ Stream to speakers

9. LOOP CONTINUES
   └─ If LLM made more function calls, go to step 6
   └─ Otherwise, await next user input
```

## 9. Critical Architectural Patterns

### Event-Driven Widget Updates
- Cortex emits events via EventEmitter
- app3.tsx has event handler dictionary mapping event types to state setters
- No prop drilling required

### Sandbox Observability
- Proxy membrane intercepts all property access and function calls
- Real-time events emitted during execution
- Function calls tracked with start/end/error states and timing
- Variable assignments tracked for inspector widget

### Provider Abstraction
- Model name → Provider detection
- Provider → API endpoint mapping
- Unified request format across providers
- Structured output format consistent

### Function Wrapper Pattern

Each function wrapped with metadata (name, description, parameters, return_type)

**Every function has access to `ops.util` context utilities:**

```typescript
ops.util.log(message)              // Logging
ops.util.event(payload)            // Emit UI event
ops.util.user_output(text)         // Display to user
ops.util.get_user_data()           // Get user input during function execution
ops.util.feedback                  // Show feedback states
ops.util.get_embedding(text)       // Compute embeddings
ops.util.set_var(value)            // Store in CortexRAM
ops.util.get_var(id)               // Retrieve from CortexRAM
```

### Persistent Sandbox
- Single iframe reused across executions
- Can be reset (clear variables) or destroyed (recreate)
- Reduces overhead for multiple code runs

## 10. Key File Reference

### Core Agent Engine
- `/app/laboratory/src/cortex.ts` - LLM loop, function execution, provider routing

### Web UI & Components
- `app3.tsx` - Main component, state management, event handling
- `cortex_agent_web.ts` - Function definitions, agent configuration
- `WidgetItem.tsx` - Base widget wrapper with drag handle, controls, fullscreen
- `widgets/*.tsx` - 12 visualization components
- `types/execution.ts` - Type definitions for execution history

### Execution & Isolation
- `src/IframeSandbox.ts` - Iframe sandbox implementation
- `src/sandbox.ts` - Public API for sandbox
- `mcp_adapter.ts` - MCP server integration

### UI Control & Layout
- `components/TopBar.tsx` - Control bar with mode/model/rate selectors
- `components/DraggableWidgetGrid.tsx` - Responsive grid layout
- `components/SettingsPanel.tsx` - Audio/widget configuration
- `components/VoiceStatusIndicator.tsx` - Status display
- `components/AudioVisualization.tsx` - Audio level visualization

### State Management & Configuration
- `hooks/useCortexAgent.ts` - Agent initialization
- `hooks/useWidgetConfig.ts` - Widget persistence + presets
- `disabled_functions.ts` - Reference implementations

## 11. Development Guide

### Adding a New Widget

1. **Create Widget Component** - `widgets/YourWidget.tsx`
   ```typescript
   import WidgetItem from '../WidgetItem'

   interface YourWidgetProps {
     fullscreen?: boolean
     onFocus?: () => void
     onClose?: () => void
     data: YourDataType  // Your specific data
     controls?: React.ReactNode  // Optional custom controls
   }

   const YourWidget: React.FC<YourWidgetProps> = ({ fullscreen, onFocus, onClose, data, controls }) => {
     return (
       <WidgetItem title="Your Widget" fullscreen={fullscreen} onFocus={onFocus} onClose={onClose} controls={controls}>
         {/* Your widget content */}
       </WidgetItem>
     )
   }
   ```

2. **Register in useWidgetConfig.ts**
   ```typescript
   const DEFAULT_WIDGETS: WidgetConfig[] = [
     // ... existing widgets
     { id: 'yourWidget', name: 'Your Widget', visible: true, order: 12 },
   ]
   ```

3. **Add to DraggableWidgetGrid.tsx**
   ```typescript
   const DEFAULT_LAYOUT: { [key: string]: WidgetGridConfig } = {
     // ... existing layouts
     yourWidget: { i: 'yourWidget', x: 0, y: 20, w: 6, h: 4, minW: 4, minH: 3 },
   }
   ```

4. **Import and Render in app3.tsx**
   ```typescript
   import YourWidget from "./widgets/YourWidget"

   // In renderWidget switch:
   case 'yourWidget':
     return <YourWidget data={yourData} onFocus={() => setFocusedWidget('yourWidget')} />

   // In fullscreen section:
   {focusedWidget === 'yourWidget' && (
     <YourWidget data={yourData} fullscreen onClose={() => setFocusedWidget(null)} />
   )}
   ```

### Adding a New Agent Function

1. **Define Function in cortex_agent_web.ts**
   ```typescript
   export async function your_function(params: { arg1: string, arg2: number }, ops: any) {
     ops.util.log(`Executing your_function with ${params.arg1}`)

     // Your logic here
     const result = await doSomething(params.arg1, params.arg2)

     // Emit events if needed
     ops.util.event({ type: 'your_event', data: result })

     return result
   }
   ```

2. **Register in get_agent() or get_agent_with_mcp()**
   ```typescript
   const agent_functions = [
     // ... existing functions
     wrap_function(your_function, {
       name: 'your_function',
       description: 'What your function does',
       parameters: {
         arg1: { type: 'string', description: 'Description of arg1' },
         arg2: { type: 'number', description: 'Description of arg2' }
       },
       return_type: 'object'
     })
   ]
   ```

### Emitting Custom Events

**From Agent Functions:**
```typescript
ops.util.event({
  type: 'your_custom_event',
  payload: { your: 'data' }
})
```

**Handle in app3.tsx:**
```typescript
const handle_your_event = useCallback((evt: any) => {
  setYourState(evt.payload)
}, [])

const event_dic = useMemo(() => ({
  // ... existing handlers
  'your_custom_event': handle_your_event
}), [handle_your_event])
```

### Working with Execution History

**Access Current or Historical Data:**
```typescript
// In widget components, prefer currentExecution over live state
const displayData = currentExecution?.yourData || liveYourData

// This allows widgets to show both:
// - Live data during active execution (currentExecution is null or latest)
// - Historical data when user selects past execution
```

**Capture Additional Data in Snapshots:**

Modify the snapshot capture in `app3.tsx`:
```typescript
useEffect(() => {
  if ((executionStatus === 'success' || executionStatus === 'error') && executionId) {
    const snapshot: ExecutionSnapshot = {
      // ... existing fields
      yourCustomData: currentYourData  // Add your field
    }
    setExecutionHistory(prev => [...prev, snapshot].slice(-100))
  }
}, [executionStatus, executionId, currentYourData])
```

### Common Patterns

**Pattern: Observability Events**
- Sandbox events bubble up through `IframeSandbox.ts`
- Emitted as `'sandbox_event'` with `eventType` field
- Routed to handlers in `app3.tsx`
- Update widget state arrays (functionCalls, variableAssignments, sandboxLogs)

**Pattern: Widget Data Flow**
```
Agent Function → ops.util.event() → event_dic[type] → setState → Widget Props → Re-render
```

**Pattern: Fullscreen Toggle**
```
Widget onClick → onFocus() → setFocusedWidget('widgetId') → Conditional render in app3.tsx
```

**Pattern: Layout Persistence**
```
Grid Drag/Resize → onLayoutChange → saveLayout() → localStorage → Restored on mount
```

### Debugging Tips

**Check Agent State:**
```javascript
// In browser console:
window.COR.chat_history  // View conversation
window.COR.is_running_function  // Check if function executing
window.workspace  // Inspect workspace object
window.sandbox  // Access sandbox API
```

**Enable Verbose Logging:**
```typescript
// In app3.tsx, add to log function:
const log = (msg: any) => {
  console.log('[Cortex]', msg)  // Already logs to console
}
```

**Inspect Execution History:**
```typescript
// Add temporary useEffect in app3.tsx:
useEffect(() => {
  console.log('Execution History:', executionHistory)
  console.log('Selected Index:', selectedIndex)
  console.log('Current Execution:', currentExecution)
}, [executionHistory, selectedIndex, currentExecution])
```

**Test Sandbox Isolation:**
```javascript
// In Code Execution widget or via agent:
display_code(`
  try {
    console.log(document)  // Should fail
  } catch(e) {
    console.log('✓ Isolated:', e.message)
  }
`, 'javascript')
```

### Performance Considerations

**Widget Rendering:**
- Widgets re-render on every state change
- Consider `React.memo()` for expensive components
- Use `useMemo()` for expensive computations

**History Array:**
- Limited to 100 executions to prevent memory growth
- Deep clones on capture prevent mutation issues
- Consider indexedDB for larger history (future enhancement)

**Sandbox Performance:**
- Iframe is persistent (not recreated each execution)
- Warm-up on first load improves subsequent runs
- Reset vs Destroy tradeoff: Reset is faster but keeps iframe

## Summary

The Cortex architecture provides a comprehensive voice agent system with:

1. **Real-time observability** - Track every function call, variable assignment, and console log
2. **Secure code execution** - Iframe-based sandboxing with membrane pattern for safety
3. **Modular UI components** - 12 widgets with drag/drop/resize and presets
4. **Execution history** - Time-travel debugging with index-based architecture
5. **Flexible AI provider support** - OpenAI, Anthropic, and Google Gemini
6. **Voice-first interaction** - VAD-based transcription and TTS output
7. **Dynamic function management** - Store, load, and execute functions from database
8. **MCP integration** - Connect to external MCP servers for extended functionality

The system is designed for interactive AI agent development with full visibility into agent reasoning, code execution, and system state.
