# TS_VAD API Reference

Complete API documentation for TS_VAD.

## Table of Contents

- [TSVAD Class](#tsvad-class)
- [Types and Interfaces](#types-and-interfaces)
- [Events](#events)
- [Constants](#constants)
- [Utility Classes](#utility-classes)

## TSVAD Class

The main entry point for voice activity detection.

### Constructor

```typescript
constructor(options: TSVADOptions)
```

Creates a new TSVAD instance.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `TSVADOptions` | Yes | Configuration object |

**Example:**
```typescript
const vad = new TSVAD({
  silero: sileroSession,
  positiveSpeechThreshold: 0.3,
  negativeSpeechThreshold: 0.25,
  redemptionMs: 1400,
  preSpeechPadMs: 800,
  minSpeechMs: 400
});
```

### Methods

#### `start(audioContext, stream)`

Starts voice activity detection.

```typescript
async start(
  audioContext: AudioContext,
  stream: MediaStream
): Promise<void>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `audioContext` | `AudioContext` | Web Audio API context |
| `stream` | `MediaStream` | Audio stream from `getUserMedia()` |

**Returns:** `Promise<void>` - Resolves when VAD is ready

**Throws:**
- Error if AudioWorklet is not supported
- Error if worklet module fails to load
- Error if audio nodes cannot be created

**Example:**
```typescript
const ctx = new AudioContext();
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
await vad.start(ctx, stream);
```

**State Transitions:**
- `stopped` → `running`: First call
- `paused` → `running`: Resume after pause
- `running` → `running`: No-op (idempotent)

#### `pause()`

Pauses voice activity detection without cleanup.

```typescript
pause(): void
```

**Returns:** `void`

**Behavior:**
- Disconnects audio nodes (stops receiving audio)
- Pauses frame processor (stops generating events)
- If currently speaking, may emit `speech-end` event
- Keeps resources allocated for fast resume

**Example:**
```typescript
vad.pause();
// VAD stops processing, but can quickly resume
```

**State Transitions:**
- `running` → `paused`
- `paused` → `paused`: No-op
- `stopped` → `stopped`: No-op

#### `stop()`

Stops VAD completely and releases all resources.

```typescript
stop(): void
```

**Returns:** `void`

**Behavior:**
- Disconnects and destroys audio nodes
- Sends stop message to worklet
- Cleans up blob URL
- Resets model state
- Resets frame processor
- Clears all internal references

**Example:**
```typescript
vad.stop();
// VAD fully stopped, requires start() to use again
```

**State Transitions:**
- `running` → `stopped`
- `paused` → `stopped`
- `stopped` → `stopped`: No-op

#### `setOptions(options)`

Updates configuration at runtime.

```typescript
setOptions(options: TSVADPartialOptions): void
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `options` | `TSVADPartialOptions` | Partial configuration to update |

**Returns:** `void`

**Example:**
```typescript
// Make more sensitive
vad.setOptions({
  positiveSpeechThreshold: 0.2,
  negativeSpeechThreshold: 0.15
});

// Increase minimum speech duration
vad.setOptions({
  minSpeechMs: 600
});
```

**Notes:**
- Only provided options are updated
- Changes take effect immediately
- Does not require restart

#### `getState()`

Returns current VAD state.

```typescript
getState(): 'stopped' | 'running' | 'paused'
```

**Returns:** Current state string

**Example:**
```typescript
const state = vad.getState();
if (state === 'running') {
  console.log('VAD is active');
}
```

#### `on(event, callback)`

Registers an event listener.

```typescript
on<K extends TSVADEventType>(
  event: K,
  callback: TSVADEventMap[K]
): void
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `event` | `TSVADEventType` | Event name |
| `callback` | Function | Event handler |

**Example:**
```typescript
vad.on('speech-start', () => {
  console.log('Speech started');
});

vad.on('speech-end', (audio: Float32Array) => {
  console.log('Speech ended', audio.length);
});
```

**Notes:**
- Multiple listeners can be registered for same event
- Same callback can be registered multiple times
- Errors in callbacks don't affect other listeners

#### `off(event, callback)`

Removes an event listener.

```typescript
off<K extends TSVADEventType>(
  event: K,
  callback: TSVADEventMap[K]
): void
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `event` | `TSVADEventType` | Event name |
| `callback` | Function | Event handler to remove |

**Example:**
```typescript
const handler = (audio) => console.log(audio);
vad.on('speech-end', handler);
vad.off('speech-end', handler);  // Remove
```

**Notes:**
- Must pass same function reference
- No-op if callback not registered

#### `removeAllListeners(event?)`

Removes all listeners for an event, or all events.

```typescript
removeAllListeners<K extends TSVADEventType>(event?: K): void
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `event` | `TSVADEventType` | Optional event name |

**Example:**
```typescript
// Remove all speech-end listeners
vad.removeAllListeners('speech-end');

// Remove ALL listeners
vad.removeAllListeners();
```

#### `listenerCount(event)`

Returns number of listeners for an event.

```typescript
listenerCount<K extends TSVADEventType>(event: K): number
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `event` | `TSVADEventType` | Event name |

**Returns:** Number of registered listeners

**Example:**
```typescript
const count = vad.listenerCount('speech-end');
console.log(`${count} listeners registered`);
```

## Types and Interfaces

### `TSVADOptions`

Main configuration interface.

```typescript
interface TSVADOptions {
  silero: InferenceSession;
  positiveSpeechThreshold: number;
  negativeSpeechThreshold: number;
  redemptionMs: number;
  preSpeechPadMs: number;
  minSpeechMs: number;
}
```

**Properties:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `silero` | `InferenceSession` | Required | Pre-loaded Silero ONNX session |
| `positiveSpeechThreshold` | `number` | 0.3 | Speech start threshold (0-1) |
| `negativeSpeechThreshold` | `number` | 0.25 | Silence threshold (0-1) |
| `redemptionMs` | `number` | 1400 | Grace period before speech-end (ms) |
| `preSpeechPadMs` | `number` | 800 | Pre-roll audio duration (ms) |
| `minSpeechMs` | `number` | 400 | Minimum valid speech duration (ms) |

### `TSVADPartialOptions`

Partial configuration for runtime updates.

```typescript
interface TSVADPartialOptions {
  positiveSpeechThreshold?: number;
  negativeSpeechThreshold?: number;
  redemptionMs?: number;
  preSpeechPadMs?: number;
  minSpeechMs?: number;
}
```

Note: `silero` cannot be updated at runtime.

### `TSVADEventMap`

Type-safe event map.

```typescript
type TSVADEventMap = {
  'speech-start': () => void;
  'speech-end': (audio: Float32Array) => void;
  'frame-processed': (probability: number, frame: Float32Array) => void;
  'error': (error: Error) => void;
}
```

### `SpeechProbabilities`

Model output probabilities.

```typescript
interface SpeechProbabilities {
  isSpeech: number;    // 0.0 - 1.0
  notSpeech: number;   // 1.0 - isSpeech
}
```

### `FrameProcessorOptions`

Internal frame processor configuration.

```typescript
interface FrameProcessorOptions {
  positiveSpeechThreshold: number;
  negativeSpeechThreshold: number;
  redemptionMs: number;
  preSpeechPadMs: number;
  minSpeechMs: number;
}
```

### `FrameProcessorEvent`

Internal event types from frame processor.

```typescript
type FrameProcessorEvent =
  | { type: 'speech-start' }
  | { type: 'speech-end'; audio: Float32Array }
  | { type: 'frame-processed'; probability: number; frame: Float32Array }
```

## Events

### `speech-start`

Fired when speech begins.

**Callback Signature:**
```typescript
() => void
```

**When Fired:**
- Probability exceeds `positiveSpeechThreshold`
- Immediately (no delay)

**Example:**
```typescript
vad.on('speech-start', () => {
  console.log('User started speaking');
  startAnimation();
});
```

**Frequency:** 0-many times per second (depends on speech patterns)

### `speech-end`

Fired when speech ends, includes audio segment.

**Callback Signature:**
```typescript
(audio: Float32Array) => void
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `audio` | `Float32Array` | Complete speech segment @ 16kHz |

**When Fired:**
- Probability below `negativeSpeechThreshold` for `redemptionMs`
- Speech duration >= `minSpeechMs`
- Includes `preSpeechPadMs` of pre-roll audio

**Example:**
```typescript
vad.on('speech-end', (audio) => {
  console.log(`Captured ${audio.length} samples`);
  console.log(`Duration: ${audio.length / 16000}s`);

  // Send to speech recognition
  recognizeSpeech(audio);
});
```

**Audio Format:**
- Type: `Float32Array`
- Sample Rate: 16000 Hz
- Channels: 1 (mono)
- Range: -1.0 to 1.0
- Byte Order: Native endian

**Frequency:** 0-many times (depends on speech patterns)

### `frame-processed`

Fired every frame with speech probability.

**Callback Signature:**
```typescript
(probability: number, frame: Float32Array) => void
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `probability` | `number` | Speech probability (0.0 - 1.0) |
| `frame` | `Float32Array` | Audio frame (512 samples @ 16kHz) |

**When Fired:**
- Every 32ms (Silero V5 frame rate)
- Regardless of speech detection state

**Example:**
```typescript
vad.on('frame-processed', (probability, frame) => {
  // Update visualization
  updateMeter(probability);

  // Log when probability is high
  if (probability > 0.8) {
    console.log('High confidence speech');
  }
});
```

**Performance Warning:**
- Fires ~31 times per second
- Keep callback lightweight
- Avoid heavy processing
- Use `requestAnimationFrame()` for UI updates

**Frequency:** Every 32ms (31.25 Hz)

### `error`

Fired when errors occur.

**Callback Signature:**
```typescript
(error: Error) => void
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `error` | `Error` | Error object with message and stack |

**When Fired:**
- Model inference failure
- Invalid model output
- Audio processing error
- Internal exceptions

**Example:**
```typescript
vad.on('error', (error) => {
  console.error('VAD error:', error.message);

  // Show user-friendly message
  showError('Voice detection error. Please refresh.');

  // Optionally restart
  vad.stop();
  setTimeout(() => vad.start(ctx, stream), 1000);
});
```

**Error Types:**

| Error Message | Cause | Resolution |
|---------------|-------|------------|
| "No stateN output from model" | Model returned invalid output | Check model file |
| "No output data from model" | Model inference failed | Check ONNX Runtime |
| "Invalid output data type from model" | Wrong model version | Use Silero V5 |
| "AudioWorklet not supported" | Old browser | Upgrade browser |

**Frequency:** Rare (only on errors)

## Constants

### `DEFAULT_OPTIONS`

Default configuration values.

```typescript
const DEFAULT_OPTIONS = {
  positiveSpeechThreshold: 0.3,
  negativeSpeechThreshold: 0.25,
  redemptionMs: 1400,
  preSpeechPadMs: 800,
  minSpeechMs: 400
}
```

### `FRAME_SAMPLES`

Silero V5 frame size.

```typescript
const FRAME_SAMPLES = 512
```

### `SAMPLE_RATE`

Silero V5 sample rate.

```typescript
const SAMPLE_RATE = 16000
```

### `MS_PER_FRAME`

Duration of one frame.

```typescript
const MS_PER_FRAME = 32  // (512 / 16000) * 1000
```

### `MessageType`

Internal message types for worklet communication.

```typescript
enum MessageType {
  AudioFrame = 'AUDIO_FRAME',
  Stop = 'STOP'
}
```

## Utility Classes

### `SileroV5Model`

Low-level model wrapper (exported for advanced use).

```typescript
class SileroV5Model {
  constructor(session: InferenceSession)
  async process(frame: Float32Array): Promise<SpeechProbabilities>
  reset(): void
}
```

**Example:**
```typescript
import { SileroV5Model } from 'ts_vad';

const model = new SileroV5Model(sileroSession);
const probs = await model.process(audioFrame);
console.log('Speech probability:', probs.isSpeech);
```

### `FrameProcessor`

Low-level speech detection state machine (exported for advanced use).

```typescript
class FrameProcessor {
  constructor(options: FrameProcessorOptions, msPerFrame: number)
  process(frame: Float32Array, probability: number): FrameProcessorEvent[]
  setOptions(options: Partial<FrameProcessorOptions>): void
  reset(): void
  pause(): FrameProcessorEvent[]
  resume(): void
}
```

### `Resampler`

Audio resampling utility (exported for advanced use).

```typescript
class Resampler {
  constructor(nativeSampleRate: number)
  process(audioFrame: Float32Array): Float32Array[]
  reset(): void
}
```

### `EventEmitter`

Generic type-safe event emitter (exported for advanced use).

```typescript
class EventEmitter<TEventMap> {
  on<K>(event: K, callback: TEventMap[K]): void
  off<K>(event: K, callback: TEventMap[K]): void
  protected emit<K>(event: K, ...args: Parameters<TEventMap[K]>): void
  removeAllListeners<K>(event?: K): void
  listenerCount<K>(event: K): number
}
```

## Usage Patterns

### Basic Pattern

```typescript
// 1. Load model
const silero = await ort.InferenceSession.create(modelBuffer);

// 2. Create VAD
const vad = new TSVAD({ silero });

// 3. Register listeners
vad.on('speech-end', processAudio);

// 4. Start
await vad.start(audioContext, stream);
```

### Resource Cleanup Pattern

```typescript
// Store references
let vad: TSVAD | null = null;
let stream: MediaStream | null = null;

async function start() {
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  vad = new TSVAD({ silero });
  await vad.start(audioContext, stream);
}

function cleanup() {
  // Stop VAD
  if (vad) {
    vad.stop();
    vad = null;
  }

  // Stop stream
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);
```

### Error Handling Pattern

```typescript
const vad = new TSVAD({ silero });

vad.on('error', (error) => {
  console.error('VAD error:', error);
  // Don't throw - VAD will continue processing
});

try {
  await vad.start(audioContext, stream);
} catch (error) {
  // Fatal startup error
  console.error('Failed to start VAD:', error);
}
```

---

**Next**: See [EXAMPLES.md](./EXAMPLES.md) for real-world usage examples
