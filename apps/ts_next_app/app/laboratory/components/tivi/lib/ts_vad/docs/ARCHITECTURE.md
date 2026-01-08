# TS_VAD Architecture

This document provides a deep dive into the architecture, design decisions, and implementation details of TS_VAD.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Component Deep Dive](#component-deep-dive)
- [Data Flow](#data-flow)
- [Threading Model](#threading-model)
- [State Management](#state-management)
- [Performance Considerations](#performance-considerations)
- [Design Decisions](#design-decisions)

## Overview

TS_VAD is built on a modular, event-driven architecture designed for real-time speech detection with minimal latency. The system consists of seven core components working together to transform raw microphone audio into actionable speech events.

### Key Design Principles

1. **Separation of Concerns** - Each component has a single, well-defined responsibility
2. **Type Safety** - Full TypeScript with strict mode for compile-time correctness
3. **Event-Driven** - Loose coupling through event emitter pattern
4. **Performance First** - AudioWorklet for low latency, minimal main thread blocking
5. **Minimal Dependencies** - Only ONNX Runtime Web required

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER ENVIRONMENT                          │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                     USER APPLICATION                            │ │
│  │                                                                 │ │
│  │  const vad = new TSVAD({ silero })                            │ │
│  │  vad.on('speech-end', (audio) => { ... })                     │ │
│  │  await vad.start(audioContext, stream)                        │ │
│  └───────────────────────┬─────────────────────────────────────────┘ │
│                          │                                            │
│                          ▼                                            │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                      TSVAD CLASS                                 │ │
│  │                 (EventEmitter + Coordinator)                     │ │
│  │                                                                  │ │
│  │  • Manages lifecycle (start/pause/stop)                        │ │
│  │  • Coordinates components                                      │ │
│  │  • Emits events to user callbacks                             │ │
│  └─────┬────────────────────────────────────────┬──────────────────┘ │
│        │                                        │                    │
│        ▼                                        ▼                    │
│  ┌──────────────┐                        ┌──────────────┐          │
│  │   Audio      │                        │   Silero     │          │
│  │   Pipeline   │                        │   V5 Model   │          │
│  └──────┬───────┘                        └──────┬───────┘          │
│         │                                       │                   │
└─────────┼───────────────────────────────────────┼──────────────────┘
          │                                       │
          │                                       │
┌─────────▼───────────────────────────────────────▼──────────────────┐
│                         MAIN THREAD                                 │
│                                                                     │
│  ┌──────────────────┐         ┌──────────────────┐               │
│  │  MediaStream     │         │  Frame           │               │
│  │  AudioSource     │         │  Processor       │               │
│  │  Node            │         │  (State Machine) │               │
│  └────────┬─────────┘         └────────┬─────────┘               │
│           │                            │                          │
│           │                            │                          │
│           ▼                            ▼                          │
│  ┌──────────────────┐         ┌──────────────────┐               │
│  │  AudioWorklet    │  ─────► │  Event Emission  │               │
│  │  Node (Proxy)    │         │                  │               │
│  └────────┬─────────┘         └──────────────────┘               │
│           │                                                        │
└───────────┼────────────────────────────────────────────────────────┘
            │
            │ postMessage
            │
┌───────────▼────────────────────────────────────────────────────────┐
│                      AUDIO WORKLET THREAD                          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │               TSVADProcessor (AudioWorkletProcessor)         │ │
│  │                                                              │ │
│  │  ┌──────────────┐                                          │ │
│  │  │  Resampler   │                                          │ │
│  │  │              │                                          │ │
│  │  │  48kHz ──►   │                                          │ │
│  │  │  16kHz       │                                          │ │
│  │  │              │                                          │ │
│  │  │  512 samples │                                          │ │
│  │  └──────┬───────┘                                          │ │
│  │         │                                                   │ │
│  │         └─────► postMessage(frame) ──────────────────────► │ │
│  │                                                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Deep Dive

### 1. EventEmitter (`events.ts`)

**Purpose**: Type-safe event management foundation

**Implementation**:
```typescript
class EventEmitter<TEventMap> {
  private listeners: Map<keyof TEventMap, Set<Function>>

  on<K>(event: K, callback: TEventMap[K]): void
  off<K>(event: K, callback: TEventMap[K]): void
  emit<K>(event: K, ...args: Parameters<TEventMap[K]>): void
}
```

**Design Rationale**:
- Generic type parameter ensures compile-time type safety
- `Map<event, Set<callback>>` for O(1) registration/removal
- Error isolation: callback errors don't affect other listeners
- Memory efficient: Sets prevent duplicate registrations

### 2. Resampler (`resampler.ts`)

**Purpose**: Convert arbitrary sample rates to 16kHz, output fixed-size frames

**Algorithm**: Simple averaging resampler
```
Input:  [...............48kHz samples................]
                           ▼
Buffer: Accumulate until enough for output frame
                           ▼
Output: [512 samples @ 16kHz] [512 samples @ 16kHz] ...
        └─── 32ms frame ────┘
```

**Mathematical Foundation**:
```
Ratio = nativeSampleRate / targetSampleRate  (e.g., 48000 / 16000 = 3)

For each output sample:
  Average ≈3 input samples

Example:
  Input:  [1, 2, 3, 4, 5, 6, ...]  (48kHz)
  Output: [2, 5, ...]               (16kHz, averaged)
```

**State**:
- `inputBuffer: number[]` - Circular buffer of input samples
- Maintains partial frames across calls

**Performance**:
- O(n) complexity per frame
- ~0.1ms per 512-sample frame on modern CPUs
- No allocations except output frame

### 3. Silero V5 Model Wrapper (`model.ts`)

**Purpose**: Interface to ONNX Runtime for Silero VAD inference

**Model Architecture**:
```
Input:  Float32Array[512]  (32ms @ 16kHz)
        ┌──────────────┐
        │              │
State:  │   Silero V5  │  ◄── Tensor[2, 1, 128]
        │   (RNN)      │
        │              │
        └──────────────┘
Output: float (0.0 - 1.0) speech probability
        Tensor[2, 1, 128] updated state
```

**Silero V5 Specifics**:
- **Input shape**: `[1, 512]` (batch=1, samples=512)
- **State shape**: `[2, 1, 128]` (2 layers, batch=1, hidden=128)
- **Sample rate**: `int64` constant `16000`
- **Output**: `[1, 1]` single probability value

**State Management**:
```typescript
// Initialize: zeros
state = Tensor('float32', Array(256).fill(0), [2, 1, 128])

// Each inference:
outputs = await session.run({ input, state, sr })
state = outputs['stateN']  // Update for next frame

// Reset: recreate zeros tensor
```

**Why stateful?**
- RNN maintains temporal context across frames
- Better accuracy than independent frame classification
- Smooths predictions over time

### 4. Frame Processor (`frame-processor.ts`)

**Purpose**: Speech detection state machine with sophisticated logic

**State Machine**:
```
         NOT_SPEAKING
              │
              │ prob > posThreshold
              ▼
         SPEAKING
              │
              │ prob < negThreshold
              │ for redemptionFrames
              ▼
        SPEECH_END
              │
              │ speechFrames >= minSpeechFrames?
              ├─── Yes ──► emit('speech-end', audio)
              └─── No  ──► discard (misfire)
              │
              ▼
         NOT_SPEAKING
```

**Audio Buffer Management**:
```
When NOT speaking:
  Buffer: [===preSpeechPad===]
          └── 800ms (25 frames @ 32ms) ──┘
          Only keep most recent frames

When SPEAKING:
  Buffer: [preSpeech][====all speech frames====]
          Accumulate everything

On speech end:
  Return: concatenated Float32Array of all frames
```

**Redemption Logic**:
```
Frame:    [1] [2] [3] [4] [5] [6] [7] [8]
Speech:    S   S   S   -   -   S   S   S
          ┌───────┐   │   │   └────────┐
          │       │   │   │            │
          │       │   ▼   ▼            │
          │       │ redemption         │
          │       │ counter++          │
          │       │                    │
          │       │                    │ Counter reset!
          │       │                    │ Still speaking
          └───────┴────────────────────┘
                  Single phrase
```

**Parameters Explained**:

- **positiveSpeechThreshold** (0.3): Probability to trigger speech start
  - Higher = less sensitive, fewer false positives
  - Lower = more sensitive, catches quiet speech

- **negativeSpeechThreshold** (0.25): Probability to begin redemption countdown
  - Usually 0.05 below positive threshold
  - Creates hysteresis to prevent flickering

- **redemptionMs** (1400ms): Grace period before speech-end
  - Allows for pauses within speech (breathing, thinking)
  - ~43 frames at 32ms per frame

- **preSpeechPadMs** (800ms): Audio before speech start to include
  - Captures onset of speech that triggered detection
  - ~25 frames

- **minSpeechMs** (400ms): Minimum valid speech duration
  - Filters out brief noises, clicks, pops
  - ~12 frames

### 5. AudioWorklet Processor (`worklet.ts`)

**Purpose**: Off-main-thread audio processing

**Why AudioWorklet?**
- Runs on dedicated high-priority audio thread
- Guaranteed 128-sample callback (not affected by main thread jank)
- Zero-copy data transfer with `transferables`

**Code Structure**:
```javascript
class TSVADProcessor extends AudioWorkletProcessor {
  constructor() {
    this.resampler = new Resampler(sampleRate)
  }

  process(inputs, outputs, parameters) {
    const audioData = inputs[0][0]  // First input, first channel

    // Resample
    const frames = this.resampler.process(audioData)

    // Transfer to main thread (zero-copy)
    for (const frame of frames) {
      this.port.postMessage(
        { type: 'AUDIO_FRAME', data: frame.buffer },
        [frame.buffer]  // Transferable!
      )
    }

    return true  // Keep processing
  }
}
```

**Callback Rate**:
```
Sample Rate: 48000 Hz
Buffer Size: 128 samples (browser default)
Callback:    Every 2.67ms (128 / 48000)

Per callback:
  Input:  128 samples @ 48kHz
  Output: 0-1 frames @ 16kHz (512 samples)

After ~11 callbacks: One complete 16kHz frame ready
```

### 6. TSVAD Main Class (`ts-vad.ts`)

**Purpose**: Orchestrator and public API

**Responsibilities**:
1. **Lifecycle Management**: start → running → paused → stopped
2. **Audio Pipeline Setup**: Create and connect AudioContext nodes
3. **Worklet Communication**: Handle messages from audio thread
4. **Component Coordination**: Model → FrameProcessor → Events
5. **Event Emission**: Translate internal events to user callbacks

**State Transitions**:
```
   ┌─────────┐
   │ stopped │ ◄───────────────┐
   └────┬────┘                 │
        │ start()              │
        ▼                      │
   ┌─────────┐                 │
   │ running │ ◄──────┐        │
   └────┬────┘        │        │
        │             │        │
        │ pause()     │ start()│
        ▼             │        │
   ┌─────────┐        │        │
   │ paused  │────────┘        │
   └────┬────┘                 │
        │                      │
        │ stop()               │
        └──────────────────────┘
```

**Async Processing Pipeline**:
```typescript
// Worklet posts message (audio thread)
workletNode.port.postMessage({ type: 'AUDIO_FRAME', data: frame.buffer })

// Main thread receives (non-blocking)
workletNode.port.onmessage = (e) => {
  this.handleWorkletMessage(e.data)  // Synchronous dispatch
}

// Process asynchronously
async handleWorkletMessage(message) {
  const frame = new Float32Array(message.data)

  // Model inference (async WASM)
  const probs = await this.model.process(frame)

  // State machine (sync)
  const events = this.frameProcessor.process(frame, probs.isSpeech)

  // Emit events (sync)
  events.forEach(e => this.emit(...))
}
```

**Error Handling Strategy**:
- Catch async errors in processFrame()
- Emit 'error' event (don't throw)
- Continue processing subsequent frames
- User responsible for error recovery

## Data Flow

### Complete Request Flow (Single Frame)

```
Time: T=0ms
─────────────────────────────────────────────────────────────
[AUDIO THREAD]
  Microphone → AudioContext → TSVADProcessor.process()
    Input: 128 samples @ 48kHz
    Resampler: buffer += 128
    Output: (not enough for complete frame yet)

Time: T+29ms (11th callback)
─────────────────────────────────────────────────────────────
[AUDIO THREAD]
  Microphone → AudioContext → TSVADProcessor.process()
    Input: 128 samples @ 48kHz
    Resampler: buffer += 128 (now 1408 samples)
    Output: 512 samples @ 16kHz (complete frame!)
    postMessage({ data: frame.buffer }) ──────────┐
                                                   │
Time: T+29ms + ~0.1ms                             │
─────────────────────────────────────────────────┼─────────
[MAIN THREAD]                                     │
  onmessage({ data: ArrayBuffer }) ◄──────────────┘
    ▼
  new Float32Array(data) → frame[512]
    ▼
  model.process(frame) → async WASM execution
    ▼
  [~2-5ms later]
    ▼
  { isSpeech: 0.85, notSpeech: 0.15 }
    ▼
  frameProcessor.process(frame, 0.85)
    ▼
  State machine evaluation
    ▼
  return [ { type: 'frame-processed', ... },
           { type: 'speech-start' } ]
    ▼
  emit('frame-processed', 0.85, frame)
  emit('speech-start')
    ▼
  User callbacks invoked
    ▼
  [Done - ready for next frame]

Total latency: ~32-35ms from microphone to callback
```

### Batch Processing Example (1 second of audio)

```
1 second @ 48kHz = 48,000 samples
÷ 128 samples per callback = 375 callbacks
÷ ~11 callbacks per frame = ~34 frames @ 16kHz

Timeline:
T=0ms    : Frame 1 starts accumulating
T=29ms   : Frame 1 complete → process
T=61ms   : Frame 2 complete → process
T=93ms   : Frame 3 complete → process
...
T=1000ms : ~34 frames processed

User sees:
- 34 'frame-processed' events
- 0-10 'speech-start' / 'speech-end' events (depending on speech)
```

## Threading Model

### Thread Safety

**Audio Thread (Worklet)**:
- Immutable: `sampleRate` (from browser)
- Mutable: `resampler.inputBuffer` (single-threaded, no sync needed)
- Communication: postMessage (structured clone + transferables)

**Main Thread**:
- Mutable: All TSVAD state (single-threaded JavaScript)
- Async: Model inference (WASM workers internally)
- No shared memory between threads

### Memory Transfer

```
Audio Thread                    Main Thread
────────────────────────────────────────────────────────
Float32Array
  frame.buffer ──────────────►  (transferred, zero-copy)
  frame is now detached         new Float32Array(buffer)
  Cannot access anymore         Can access normally

Benefits:
- Zero copy (instant transfer)
- No serialization overhead
- Prevents concurrent access bugs
```

## State Management

### Component State Summary

| Component | State | Lifecycle |
|-----------|-------|-----------|
| TSVAD | `state: 'stopped' \| 'running' \| 'paused'` | User controls |
| Model | `stateTensor: Tensor[2,1,128]` | Reset on stop |
| FrameProcessor | `speaking: boolean`, `audioBuffer`, counters | Reset on stop/pause |
| Resampler (worklet) | `inputBuffer: number[]` | Persistent |
| Resampler (main) | N/A | Not used in main thread |

### State Synchronization

**Problem**: AudioWorklet keeps running even when paused

**Solution**:
```typescript
pause() {
  // Don't stop worklet (would require reload)
  // Just stop processing messages
  frameProcessor.pause()
  // Ignore messages until resume
}

resume() {
  frameProcessor.resume()
  // Start processing messages again
}
```

**Tradeoff**: Worklet continues posting messages during pause (wasted CPU), but avoids worklet reload overhead

## Performance Considerations

### Bottlenecks

1. **Model Inference**: ~2-5ms per frame (WASM execution)
   - Dominates processing time
   - Runs async, doesn't block main thread
   - ONNX Runtime handles threading internally

2. **Resampling**: ~0.1ms per frame
   - Simple averaging algorithm
   - Negligible overhead

3. **Frame Processing**: ~0.01ms per frame
   - Pure JavaScript state machine
   - Negligible overhead

4. **Event Emission**: Depends on user callbacks
   - User responsible for performance
   - Keep callbacks lightweight

### Memory Usage

```
Component             Memory
──────────────────────────────────────
Silero V5 Model       ~9 MB (WASM + weights)
State Tensor          ~1 KB
Frame Buffers         ~50 KB (25 frames pre-speech pad)
Resampler Buffer      ~5 KB
Total                 ~10 MB
```

### Optimization Techniques

1. **Transferables**: Zero-copy frame transfer from worklet
2. **Async Model**: Doesn't block event loop
3. **Efficient Resampling**: Simple averaging, no FFT
4. **Minimal Allocations**: Reuse tensors, typed arrays

## Design Decisions

### Why AudioWorklet Only?

**Pros**:
- High-priority audio thread
- Guaranteed callback rate
- No main thread jank
- Modern, official API

**Cons**:
- Not supported in old browsers
- Requires HTTPS
- Slightly more complex setup

**Decision**: Modern browsers only (2020+) for best UX

### Why User Provides Model?

**Alternatives Considered**:
1. Bundle model with library (bloat)
2. Download model automatically (privacy concerns, CORS)
3. User provides model (chosen)

**Rationale**:
- User controls model source (CDN, local, custom)
- Smaller library bundle
- User controls ONNX Runtime configuration
- Flexibility for future models

### Why Event-Based API?

**Alternatives Considered**:
1. Callbacks in constructor (less flexible)
2. Promises (doesn't fit streaming model)
3. Async iterators (overkill)
4. Events (chosen)

**Rationale**:
- Familiar pattern (Node.js EventEmitter)
- Multiple listeners per event
- Easy to add/remove listeners
- Type-safe with generics

### Why V5 Only?

**Alternatives Considered**:
1. Support Legacy + V5 (more code)
2. V5 only (chosen)

**Rationale**:
- V5 is newer, better accuracy
- Smaller frames (512 vs 1536) = lower latency
- Simpler codebase (one code path)
- Users can still use Legacy by adapting model wrapper

---

**Next**: See [API.md](./API.md) for complete API reference
