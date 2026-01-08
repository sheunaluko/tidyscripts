# Component Architecture Guide

## Principles

### 1. **Separation of Concerns**
- **Components** = Presentational layer (UI)
- **Hooks** (`lib/`) = Business logic & state management
- **Utils** (`lib/`) = Pure functions

### 2. **State Management Agnostic**
All components support **both** controlled and uncontrolled modes:

#### Uncontrolled (Internal State)
```tsx
<VoiceInterface
  onTranscription={(result) => console.log(result.text)}
/>
```

#### Controlled (External State - Zustand)
```tsx
const { isRecording, transcription } = useVoiceStore();

<VoiceInterface
  isRecording={isRecording}
  transcription={transcription}
  onRecordingChange={useVoiceStore.getState().setRecording}
  onTranscriptionChange={useVoiceStore.getState().setTranscription}
/>
```

#### Direct Hook Usage (Custom State Management)
```tsx
const { isRecording, startRecording, stopRecording } = useVoiceRecorder({
  onAudioData: (data) => myStore.setAudioLevel(data.level)
});
```

## Component Structure

```
/components/[component-name]/
├── [component-name].tsx       # Presentational component
├── lib/                       # Logic layer
│   ├── use[Feature].ts       # Custom hooks
│   ├── [feature]-utils.ts    # Pure utility functions
│   ├── types.ts              # TypeScript types
│   └── index.ts              # Exports
└── index.ts                  # Main export
```

## Best Practices

### Props Interface Design

```typescript
export interface ComponentProps {
  // CONTROLLED STATE (optional - for external state management)
  value?: ValueType;
  onChange?: (value: ValueType) => void;

  // CALLBACKS (for side effects)
  onSomethingHappened?: (data: EventData) => void;
  onError?: (error: Error) => void;

  // CONFIGURATION (behavior customization)
  autoStart?: boolean;
  variant?: 'default' | 'compact';

  // DISPLAY (presentation)
  showFeature?: boolean;
  height?: number;
}
```

### State Pattern Rules

1. **If prop is provided** → Use it (controlled mode)
2. **If prop is undefined** → Manage internally (uncontrolled mode)
3. **Always provide callbacks** → Parent can react to changes

### Example: Controlled/Uncontrolled Pattern

```typescript
export const MyComponent: React.FC<MyComponentProps> = ({
  value: controlledValue,
  onChange,
  onEvent,
}) => {
  // Determine if controlled
  const isControlled = controlledValue !== undefined;

  // Internal state (only used in uncontrolled mode)
  const [internalValue, setInternalValue] = useState(defaultValue);

  // Use controlled or uncontrolled value
  const value = isControlled ? controlledValue : internalValue;

  const handleChange = (newValue) => {
    // Always notify parent
    onChange?.(newValue);

    // Only update internal state if uncontrolled
    if (!isControlled) {
      setInternalValue(newValue);
    }
  };

  return <div>{/* ... */}</div>;
};
```

## Integration Examples

### With Zustand

```typescript
// store.ts
import { create } from 'zustand';

interface VoiceStore {
  isRecording: boolean;
  transcription: string;
  setRecording: (isRecording: boolean) => void;
  setTranscription: (text: string) => void;
}

export const useVoiceStore = create<VoiceStore>((set) => ({
  isRecording: false,
  transcription: '',
  setRecording: (isRecording) => set({ isRecording }),
  setTranscription: (transcription) => set({ transcription }),
}));

// Usage in component
import { useVoiceStore } from './store';
import { VoiceInterface } from '@/components/voice';

function MyApp() {
  const { isRecording, transcription, setRecording, setTranscription } = useVoiceStore();

  return (
    <VoiceInterface
      isRecording={isRecording}
      transcription={transcription}
      onRecordingChange={setRecording}
      onTranscriptionChange={setTranscription}
    />
  );
}
```

### With Custom Hooks Only

```typescript
import { useVoiceRecorder, useTranscription } from '@/components/voice';

function MyApp() {
  const [messages, setMessages] = useState([]);

  const { isRecording, startRecording, stopRecording } = useVoiceRecorder();

  const { transcription } = useTranscription({
    onTranscription: (result) => {
      if (result.isFinal) {
        setMessages(prev => [...prev, result.text]);
      }
    }
  });

  return (
    <div>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop' : 'Start'}
      </button>
      <div>{transcription}</div>
    </div>
  );
}
```

### With Context API

```typescript
const VoiceContext = createContext(null);

function VoiceProvider({ children }) {
  const [state, setState] = useState({
    isRecording: false,
    transcription: '',
  });

  return (
    <VoiceContext.Provider value={{ state, setState }}>
      {children}
    </VoiceContext.Provider>
  );
}

function MyComponent() {
  const { state, setState } = useContext(VoiceContext);

  return (
    <VoiceInterface
      isRecording={state.isRecording}
      transcription={state.transcription}
      onRecordingChange={(isRecording) =>
        setState(prev => ({ ...prev, isRecording }))
      }
    />
  );
}
```

## Type Safety

Always export types for external use:

```typescript
// Component exports
export type { VoiceInterfaceProps } from './voice_interface';

// Hook exports
export type { UseVoiceRecorderReturn } from './lib/useVoiceRecorder';

// Type exports
export type { TranscriptionResult, AudioData } from './lib/types';
```

## Testing

Components should be testable in isolation:

```typescript
// Uncontrolled mode test
test('manages own state', () => {
  const { result } = renderHook(() => useVoiceRecorder());

  await act(async () => {
    await result.current.startRecording();
  });

  expect(result.current.isRecording).toBe(true);
});

// Controlled mode test
test('uses external state', () => {
  const onRecordingChange = jest.fn();

  render(
    <VoiceInterface
      isRecording={false}
      onRecordingChange={onRecordingChange}
    />
  );

  // Click record button
  fireEvent.click(screen.getByRole('button'));

  expect(onRecordingChange).toHaveBeenCalledWith(true);
});
```

## Summary

✅ **DO**:
- Support both controlled and uncontrolled modes
- Separate logic into hooks
- Export hooks for direct use
- Use callback props for communication
- Make components state-management agnostic

❌ **DON'T**:
- Hardcode state management library imports in components
- Mix UI and business logic
- Force a specific state management pattern
- Create tight coupling between components and stores
