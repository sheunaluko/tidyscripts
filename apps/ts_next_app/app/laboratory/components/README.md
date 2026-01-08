# Tidyscripts Laboratory Components

This directory contains reusable components for the Tidyscripts Laboratory.

## Architecture Principles

### 1. **Separation of Concerns**

Each component must maintain clear separation between:
- **UI Layer** (`component.tsx`) - Presentational component
- **Logic Layer** (`lib/`) - Business logic, hooks, and utilities
- **Types** (`lib/types.ts`) - TypeScript interfaces and types

### 2. **State Management Agnostic Design**

**CRITICAL**: All components MUST support both controlled and uncontrolled modes to work seamlessly with any state management solution (Zustand, Redux, Context, etc.).

#### Uncontrolled Mode (Internal State)
Component manages its own state internally:
```tsx
<VoiceInterface
  onTranscription={(result) => console.log(result.text)}
/>
```

#### Controlled Mode (External State Management)
Parent component controls the state:
```tsx
// With Zustand
const { isRecording, transcription } = useVoiceStore();

<VoiceInterface
  isRecording={isRecording}
  transcription={transcription}
  onRecordingChange={useVoiceStore.getState().setRecording}
  onTranscriptionChange={useVoiceStore.getState().setTranscription}
/>
```

#### Direct Hook Usage
Apps can use hooks directly with custom state management:
```tsx
const { isRecording, startRecording } = useVoiceRecorder({
  onAudioData: (data) => myCustomStore.updateAudio(data)
});
```

## Component Structure

```
/components/[component-name]/
├── [component-name].tsx       # Presentational component (UI)
├── lib/                       # Logic and utilities
│   ├── use[Feature].ts       # Custom hooks (business logic)
│   ├── [feature]-utils.ts    # Pure utility functions
│   ├── types.ts              # Shared TypeScript types
│   └── index.ts              # Exports
└── index.ts                  # Main component export
```

## Props Interface Design Standards

### Required Pattern
```typescript
export interface ComponentProps {
  // CONTROLLED STATE (optional - enables external state management)
  value?: ValueType;
  onChange?: (value: ValueType) => void;

  // CALLBACKS (for events and side effects)
  onEventHappened?: (data: EventData) => void;
  onError?: (error: Error) => void;

  // CONFIGURATION (behavior)
  autoStart?: boolean;
  variant?: 'default' | 'compact';

  // DISPLAY (presentation)
  showFeature?: boolean;
  customHeight?: number;
}
```

### Controlled/Uncontrolled Implementation Pattern

```typescript
export const MyComponent: React.FC<MyComponentProps> = ({
  // Controlled props
  value: controlledValue,
  onChange,

  // Callbacks
  onEvent,

  // Config
  autoStart = false,
}) => {
  // Determine if component is controlled
  const isControlled = controlledValue !== undefined;

  // Internal state (only used if uncontrolled)
  const [internalValue, setInternalValue] = useState(defaultValue);

  // Use controlled value if provided, otherwise use internal
  const value = isControlled ? controlledValue : internalValue;

  const handleChange = (newValue: ValueType) => {
    // Always notify parent through callback
    onChange?.(newValue);

    // Only update internal state if uncontrolled
    if (!isControlled) {
      setInternalValue(newValue);
    }
  };

  return (
    <div>{/* Component JSX */}</div>
  );
};
```

## Hook Design Standards

### Hooks Must Be:
1. **Reusable** - Can be used independently of the component
2. **Composable** - Can be combined with other hooks
3. **State-agnostic** - Don't import state management libraries

### Example Hook Structure
```typescript
export interface UseFeatureOptions {
  onEvent?: (data: EventData) => void;
  onError?: (error: Error) => void;
  config?: ConfigType;
}

export interface UseFeatureReturn {
  state: StateType;
  actions: {
    doSomething: () => void;
    doOtherThing: () => void;
  };
  error: Error | null;
}

export function useFeature(options: UseFeatureOptions = {}): UseFeatureReturn {
  // Hook implementation
  // Returns state and actions, never manages external state
}
```

## Type Safety Requirements

### All components must export:
```typescript
// Component types
export type { ComponentProps } from './component';

// Hook types
export type { UseFeatureReturn, UseFeatureOptions } from './lib/useFeature';

// Domain types
export type { EventData, StateType } from './lib/types';
```

## Integration Examples

### Example 1: With Zustand
```typescript
// store.ts
import { create } from 'zustand';

interface MyStore {
  isActive: boolean;
  data: string;
  setActive: (active: boolean) => void;
  setData: (data: string) => void;
}

export const useMyStore = create<MyStore>((set) => ({
  isActive: false,
  data: '',
  setActive: (isActive) => set({ isActive }),
  setData: (data) => set({ data }),
}));

// app.tsx
import { useMyStore } from './store';
import { MyComponent } from '@/components';

function App() {
  const { isActive, data, setActive, setData } = useMyStore();

  return (
    <MyComponent
      isActive={isActive}
      data={data}
      onActiveChange={setActive}
      onDataChange={setData}
    />
  );
}
```

### Example 2: Standalone with Custom State
```typescript
import { useState } from 'react';
import { MyComponent } from '@/components';

function App() {
  const [messages, setMessages] = useState([]);

  return (
    <MyComponent
      onEvent={(data) => setMessages(prev => [...prev, data])}
    />
  );
}
```

### Example 3: Direct Hook Usage
```typescript
import { useFeature } from '@/components/my-component';

function CustomApp() {
  const { state, actions } = useFeature({
    onEvent: (data) => {
      // Custom handling
      myCustomStore.update(data);
    }
  });

  return (
    <div>
      <p>{state.value}</p>
      <button onClick={actions.doSomething}>Act</button>
    </div>
  );
}
```

## Directory Structure

```
/components                      (Shared/reusable components)
├── /voice                      (Voice interaction components)
│   ├── voice_interface.tsx
│   ├── lib/
│   │   ├── useVoiceRecorder.ts
│   │   ├── useTranscription.ts
│   │   ├── audio-utils.ts
│   │   ├── types.ts
│   │   └── index.ts
│   └── index.ts
├── /data-viz                   (Data visualization - future)
├── /forms                      (Form components - future)
├── index.ts                    (Main export)
├── README.md                   (This file)
└── ARCHITECTURE.md             (Detailed architecture guide)
```

## Adding New Components Checklist

- [ ] Create component directory: `/components/[name]/`
- [ ] Implement presentational component: `[name].tsx`
- [ ] Create `/lib` subdirectory for logic
- [ ] Implement hooks in `/lib/use[Feature].ts`
- [ ] Implement utilities in `/lib/[feature]-utils.ts`
- [ ] Define types in `/lib/types.ts`
- [ ] Export from `/lib/index.ts`
- [ ] Export from component `index.ts`
- [ ] Add to main `/components/index.ts`
- [ ] Support both controlled/uncontrolled modes
- [ ] Add demo to `/component_viewer/page.tsx`
- [ ] Document props and usage

## Testing Components

Visit `/laboratory/component_viewer` to test components in isolation.

## Best Practices Summary

### ✅ DO:
- Separate UI from logic (component vs hooks)
- Support controlled and uncontrolled modes
- Export hooks for direct use
- Use callback props for communication
- Make components state-management agnostic
- Export all TypeScript types
- Document props with JSDoc
- Follow TypeScript strict mode

### ❌ DON'T:
- Import state management libraries in components (Zustand, Redux, etc.)
- Mix business logic with JSX
- Force specific state management patterns
- Create tight coupling between components and stores
- Use global state directly in components
- Forget to handle both controlled and uncontrolled cases

## Questions?

See `ARCHITECTURE.md` for detailed architectural patterns and examples.
