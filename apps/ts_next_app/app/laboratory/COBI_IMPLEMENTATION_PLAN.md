# COBI (Cortex Observability Interface) Implementation Plan

## Architecture Understanding

### Cortex Agent Architecture
The Cortex voice agent (in `cortex_0/app3.tsx`) is built on an event-driven architecture:

**Core Components:**
- **Cortex class** (`laboratory/src/cortex.ts`): Core agent managing LLM interactions
  - Extends EventEmitter to broadcast events
  - Maintains state: messages, CortexRAM, function_dictionary, is_running_function, prompt_history
  - Key methods: run_llm(), handle_function_call(), run_cortex_output(), emit_event()

- **UI Layer** (`cortex_0/app3.tsx`): React/Material UI application
  - Listens to Cortex events via `COR.on('event', handle_event)`
  - Event types: 'thought', 'log', 'workspace_update', 'code_update', 'html_update'
  - Current widgets: Chat, Thoughts, Log, Workspace, Code, HTML
  - All widgets use `WidgetItem` component for consistent UI

- **Function System** (`cortex_0/cortex_agent_web.ts`):
  - Functions provide agent capabilities
  - Each has name, description, parameters, return_type, and implementation
  - Functions receive utility object with: log, event, get_user_data, user_output, etc.

### Component Viewer Pattern
Located at `laboratory/component_viewer/`:
- Registry-based system for showcasing components in isolation
- Each demo includes: name, category, description, live component, code examples, props docs
- Uses accordion-based UI for browsing

## COBI Requirements
Create a real-time observability dashboard visualizing:
- Agent state (what's happening internally)
- Function calls (name, parameters, return values)
- Event stream
- Context/token usage
- Call stack
- CortexRAM contents

## Initial Feature Ideas

### Observability Data Sources
From the Cortex agent, we can track:
1. **Function Execution**
   - Currently executing function name
   - Function parameters (resolved)
   - Function return values
   - Execution duration
   - Error states

2. **Agent State**
   - `is_running_function` - whether a function is active
   - `messages` - conversation history length
   - Current model/provider
   - Loop counter state

3. **Events**
   - All emitted events with timestamps
   - Event type distribution
   - Event payload inspection

4. **CortexRAM**
   - Variable storage contents
   - Reference tracking (@id, $N references)
   - Memory usage estimates

5. **LLM Interactions**
   - Token usage (prompt_tokens, completion_tokens, total_tokens)
   - Response times
   - Model outputs (thoughts, function calls planned)

6. **Call Stack**
   - Nested function execution tracking
   - Call chain visualization (from run_cortex_output)
   - Return indices tracking

## User Requirements (Confirmed)

1. **Integration**: Widget in main Cortex UI only
   - Integrated alongside existing widgets (Chat, Thoughts, Log, etc.)
   - No component viewer integration needed
   - Tightly coupled to live Cortex agent

2. **Features**: All critical features (comprehensive dashboard)
   - Function call stack with parameters and return values
   - Context/token usage tracking with visual indicators
   - Real-time event stream with timestamps
   - Agent state dashboard (current function, model, flags)

3. **Visualization Style**: Live metrics dashboard
   - Cards/panels for different metrics
   - Real-time updates
   - Gauges and progress bars for numerical metrics
   - Clean, Material UI-based design

4. **Data Collection**: Two-phase approach
   - Phase 1: Extend event system with new event types
   - Phase 2: Create observability hook/manager to consume events

## Implementation Plan

### Phase 1: Extend Cortex Event System

**Goal**: Instrument the Cortex agent to emit detailed observability events

**New event types to add** (in `cortex.ts`):

1. **`function_start`**: Emitted when a function begins execution
   ```typescript
   {
     type: 'function_start',
     name: string,
     parameters: any,
     timestamp: number,
     callDepth: number,
     callId: string  // unique identifier for this call
   }
   ```

2. **`function_end`**: Emitted when a function completes
   ```typescript
   {
     type: 'function_end',
     name: string,
     result: any,
     error: boolean | string,
     duration: number,  // ms
     timestamp: number,
     callId: string
   }
   ```

3. **`llm_start`**: Emitted when LLM call begins
   ```typescript
   {
     type: 'llm_start',
     model: string,
     provider: string,
     messageCount: number,
     timestamp: number
   }
   ```

4. **`llm_end`**: Emitted when LLM call completes
   ```typescript
   {
     type: 'llm_end',
     model: string,
     usage: {
       prompt_tokens: number,
       completion_tokens: number,
       total_tokens: number
     },
     duration: number,
     timestamp: number
   }
   ```

5. **`state_change`**: Emitted when agent state changes
   ```typescript
   {
     type: 'state_change',
     field: 'is_running_function' | 'model' | 'loop_counter',
     value: any,
     timestamp: number
   }
   ```

6. **`cortex_ram_update`**: Emitted when CortexRAM is modified
   ```typescript
   {
     type: 'cortex_ram_update',
     action: 'set' | 'get',
     id: string,
     value?: any,  // only for 'set'
     timestamp: number
   }
   ```

**Modifications to `cortex.ts`**:

1. Add call tracking state:
   ```typescript
   private callStack: Array<{id: string, name: string, startTime: number}> = []
   private callIdCounter: number = 0
   private loopCounter: number = 0
   ```

2. Instrument `handle_function_call()`:
   - Emit `function_start` before execution
   - Track start time
   - Emit `function_end` after completion with duration

3. Instrument `run_llm()`:
   - Emit `llm_start` before fetch
   - Track start time
   - Emit `llm_end` in `handle_llm_response()` with token usage

4. Instrument state setters:
   - Emit `state_change` in `set_is_running_function()`
   - Emit `state_change` when loop counter changes

5. Instrument `set_var()` and `get_var()`:
   - Emit `cortex_ram_update` on set/get operations

### Phase 2: Create Observability Hook

**Goal**: Create a React hook that subscribes to events and provides organized observability state

**File**: Create `cortex_0/src/useObservability.ts`

```typescript
interface ObservabilityState {
  // Function call tracking
  currentFunction: string | null
  callStack: FunctionCallInfo[]
  functionHistory: FunctionCallInfo[]

  // Token tracking
  totalTokensUsed: number
  lastLLMCall: {
    prompt_tokens: number
    completion_tokens: number
    duration: number
  } | null

  // Event stream
  recentEvents: ObservabilityEvent[]  // last N events

  // Agent state
  agentState: {
    is_running_function: boolean
    model: string
    provider: string
    loop_counter: number
    cortexRAMSize: number
  }

  // Performance metrics
  avgFunctionDuration: number
  totalFunctionsExecuted: number
  errorCount: number
}

export function useObservability(COR: Cortex): ObservabilityState
```

**Hook implementation**:
- Subscribe to all Cortex events on mount
- Maintain state for all observability metrics
- Process events to update metrics (function_start, function_end, llm_start, llm_end, etc.)
- Provide computed metrics (averages, counts, etc.)
- Clean up event listeners on unmount
- No demo/mock mode needed - always uses live agent

### Phase 3: Create COBI Component

**Goal**: Build the observability dashboard UI component

**File**: Create `cortex_0/COBIWidget.tsx`

**Component structure**:
```tsx
interface COBIWidgetProps {
  COR: Cortex
}

export const COBIWidget: React.FC<COBIWidgetProps> = ({ COR }) => {
  const obsState = useObservability(COR)

  return (
    <Box>
      {/* Top row: Agent state + Token usage */}
      <Grid container spacing={1}>
        <Grid size={6}>
          <AgentStateCard state={obsState.agentState} />
        </Grid>
        <Grid size={6}>
          <TokenUsageCard
            total={obsState.totalTokensUsed}
            last={obsState.lastLLMCall}
          />
        </Grid>
      </Grid>

      {/* Second row: Call stack + Performance */}
      <Grid container spacing={1}>
        <Grid size={6}>
          <CallStackCard
            current={obsState.currentFunction}
            stack={obsState.callStack}
          />
        </Grid>
        <Grid size={6}>
          <PerformanceCard
            avgDuration={obsState.avgFunctionDuration}
            totalCalls={obsState.totalFunctionsExecuted}
            errorCount={obsState.errorCount}
          />
        </Grid>
      </Grid>

      {/* Bottom: Event stream */}
      <EventStreamCard events={obsState.recentEvents} />
    </Box>
  )
}
```

**Sub-components to create**:

1. **`AgentStateCard.tsx`**: Shows current agent state
   - Model/provider badge
   - is_running_function indicator (green/red light)
   - Loop counter
   - CortexRAM size
   - Current function name (if any)

2. **`TokenUsageCard.tsx`**: Token tracking with visual indicators
   - Total tokens used (accumulated)
   - Last call breakdown (prompt/completion)
   - Progress bar for context usage estimate
   - Color-coded warning for high usage

3. **`CallStackCard.tsx`**: Function call stack visualization
   - Current executing function at top
   - Stack depth visualization
   - Click to see parameters/return values
   - Execution time badges

4. **`PerformanceCard.tsx`**: Performance metrics
   - Circular gauge for avg function duration
   - Total functions executed counter
   - Error count with indicator
   - Success rate percentage

5. **`EventStreamCard.tsx`**: Real-time event feed
   - Auto-scrolling list of recent events
   - Color-coded by event type
   - Timestamp + event name + brief payload
   - Click to expand full payload

### Phase 4: Integration in Main UI

**Goal**: Integrate COBI as a widget in app3.tsx

**Modifications to `app3.tsx`**:

1. Import COBI component (add near top with other imports):
   ```tsx
   import COBIWidgetContent from "./COBIWidget"
   ```

2. Create wrapper widget (add with other widget definitions around line 620-760):
   ```tsx
   const COBIWidget = ({ fullscreen = false, onFocus, onClose }: any) => (
     <WidgetItem
       title="COBI"
       fullscreen={fullscreen}
       onFocus={onFocus}
       onClose={onClose}
     >
       <COBIWidgetContent COR={COR} />
     </WidgetItem>
   )
   ```

3. Add to Grid layout (around line 1165 in the grid section):
   ```tsx
   <Grid size={{ xs: 12, md: 6 }}>
     <COBIWidget onFocus={() => setFocusedWidget('cobi')} />
   </Grid>
   ```

4. Add fullscreen handling (around line 1206 with other fullscreen widgets):
   ```tsx
   {focusedWidget === 'cobi' && <COBIWidget fullscreen onClose={() => setFocusedWidget(null)} />}
   ```

## Critical Files to Modify

1. **`/home/oluwa/dev/tidyscripts/apps/ts_next_app/app/laboratory/src/cortex.ts`**
   - Add new event emissions throughout (function_start, function_end, llm_start, llm_end, state_change, cortex_ram_update)
   - Add call tracking state (callStack, callIdCounter, loopCounter)
   - Instrument key methods: handle_function_call(), run_llm(), handle_llm_response(), set_is_running_function(), set_var(), get_var()

2. **`/home/oluwa/dev/tidyscripts/apps/ts_next_app/app/laboratory/cortex_0/app3.tsx`**
   - Import COBI component
   - Create COBIWidget wrapper using WidgetItem
   - Add to grid layout (line ~1165)
   - Add fullscreen handling (line ~1206)

## New Files to Create

1. **`cortex_0/src/useObservability.ts`** - Observability hook (subscribes to Cortex events)
2. **`cortex_0/COBIWidget.tsx`** - Main COBI component
3. **`cortex_0/cobi/AgentStateCard.tsx`** - Agent state sub-component
4. **`cortex_0/cobi/TokenUsageCard.tsx`** - Token tracking sub-component
5. **`cortex_0/cobi/CallStackCard.tsx`** - Call stack sub-component
6. **`cortex_0/cobi/PerformanceCard.tsx`** - Performance metrics sub-component
7. **`cortex_0/cobi/EventStreamCard.tsx`** - Event stream sub-component

## Verification & Testing

**Manual Testing Steps**:

1. **Event System Verification**:
   - Open browser console
   - Start Cortex voice agent (click Start button in voice mode)
   - Trigger a simple function call (e.g., ask agent a question)
   - Verify new events appear in console:
     - `function_start` when function begins
     - `function_end` when function completes
     - `llm_start` before LLM call
     - `llm_end` after LLM responds with token usage
   - Check event payloads match expected structure

2. **Observability Hook Verification**:
   - Add debug logging to useObservability (console.log state updates)
   - Verify state updates correctly from each event type
   - Check that metrics accumulate properly (token count increases)
   - Trigger multiple function calls and verify history builds up
   - Verify cleanup on component unmount

3. **COBI Widget UI Verification**:
   - Navigate to `localhost:3000/laboratory/cortex_0` (or your Cortex URL)
   - Verify COBI widget appears in the grid alongside other widgets
   - Check that all 5 cards render:
     - AgentStateCard (top left)
     - TokenUsageCard (top right)
     - CallStackCard (middle left)
     - PerformanceCard (middle right)
     - EventStreamCard (bottom, full width)

4. **Real-time Updates**:
   - Start the agent (click Start in voice mode)
   - Ask the agent a question (voice or text input)
   - Watch COBI widget update in real-time:
     - Agent state shows is_running_function indicator turns on
     - Function call appears in call stack
     - Event stream shows function_start event
     - Token usage increments when LLM responds
     - Function completes and appears in history
   - Verify all updates happen smoothly without lag

5. **Fullscreen Mode**:
   - Click the expand icon on COBI widget
   - Verify it goes fullscreen
   - Check all cards still display correctly
   - Trigger function calls and verify updates still work
   - Click close to exit fullscreen
   - Verify data persists when toggling fullscreen

6. **Complete Voice Interaction**:
   - Use Cortex for a complete conversation (multiple turns)
   - Monitor COBI throughout:
     - Token count accumulates across multiple LLM calls
     - Function history grows with each call
     - Event stream captures all activity
     - Performance metrics update (avg duration, total calls)
   - Ask agent to perform complex tasks (database access, embeddings, etc.)
   - Verify call stack shows nested calls correctly
   - Check for any console errors or warnings

**Success Criteria**:
- ✅ All 6 new event types emitted correctly from Cortex
- ✅ useObservability hook updates state in real-time without lag
- ✅ All 5 dashboard cards display accurate, live data
- ✅ Widget integrates cleanly into main UI grid
- ✅ Fullscreen mode works correctly
- ✅ No console errors or warnings during operation
- ✅ Performance remains smooth during heavy function usage
- ✅ UI is responsive and updates reflect agent activity immediately
- ✅ Token tracking accumulates correctly across multiple LLM calls
- ✅ Call stack accurately represents execution state
