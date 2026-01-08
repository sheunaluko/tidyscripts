# TS_VAD 🎤

**Minimal, modular, event-driven Voice Activity Detection for the browser**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)

TS_VAD is a lightweight, production-ready Voice Activity Detection library built on [Silero VAD](https://github.com/snakers4/silero-vad) and [ONNX Runtime Web](https://github.com/microsoft/onnxruntime). It provides a clean, event-driven API for detecting speech in real-time audio streams.

## ✨ Features

- 🎯 **Event-Driven API** - Clean `.on()` interface with TypeScript type safety
- ⚡ **High Performance** - AudioWorklet processing for low latency (~32ms frames)
- 🎨 **Modular Architecture** - Well-structured, maintainable codebase
- 🔧 **Runtime Configuration** - Adjust sensitivity and thresholds on the fly
- 📦 **Zero Dependencies** - Only requires `onnxruntime-web` (peer dependency)
- 🎓 **Fully Typed** - Complete TypeScript support with strict mode
- 🌐 **Modern Browsers** - Works in all browsers with AudioWorklet support

## 📦 Installation

```bash
cd ts_vad
npm install
npm run build
```

## 🚀 Quick Start

```typescript
import { TSVAD } from './ts_vad/src';
import * as ort from 'onnxruntime-web';

// 1. Load the Silero V5 model
const modelBuffer = await fetch('/silero_vad_v5.onnx')
  .then(r => r.arrayBuffer());
const silero = await ort.InferenceSession.create(modelBuffer);

// 2. Create VAD instance
const vad = new TSVAD({ silero });

// 3. Listen for speech events
vad.on('speech-start', () => {
  console.log('🎤 Speech started');
});

vad.on('speech-end', (audio: Float32Array) => {
  console.log('✅ Speech ended');
  console.log(`📊 Captured ${audio.length} samples (${audio.length / 16000}s)`);
  // audio is 16kHz Float32Array - send to speech recognition, etc.
});

// 4. Start listening
const ctx = new AudioContext();
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
await vad.start(ctx, stream);

// 5. Control as needed
vad.pause();  // Pause detection
vad.stop();   // Stop and cleanup
```

## 📚 Documentation

- **[Architecture Guide](./docs/ARCHITECTURE.md)** - System design and data flow
- **[API Reference](./docs/API.md)** - Complete API documentation
- **[Usage Examples](./docs/EXAMPLES.md)** - Real-world implementation examples
- **[Implementation Guide](./docs/GUIDE.md)** - Integration walkthrough

## 🎯 Core Concepts

### Events

TS_VAD emits four event types:

- **`speech-start`** - Fired when speech begins (immediate)
- **`speech-end`** - Fired when speech ends (includes audio segment)
- **`frame-processed`** - Fired every 32ms (for visualizations, debugging)
- **`error`** - Fired on errors (model failures, audio issues)

### Configuration

Fine-tune speech detection with these parameters:

```typescript
const vad = new TSVAD({
  silero: sileroSession,
  positiveSpeechThreshold: 0.3,   // Higher = less sensitive
  negativeSpeechThreshold: 0.25,  // Lower = faster speech-end
  redemptionMs: 1400,              // Grace period before speech-end
  preSpeechPadMs: 800,             // Pre-roll audio duration
  minSpeechMs: 400                 // Minimum valid speech length
});
```

## 🎨 Architecture Overview

```
┌─────────────┐
│ Microphone  │
└──────┬──────┘
       │ MediaStream (48kHz)
       ▼
┌──────────────────┐
│  AudioContext    │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  AudioWorklet    │ ◄── Runs on audio thread
│  (Resampler)     │     Converts 48kHz → 16kHz
└──────┬───────────┘     Outputs 512-sample frames
       │
       │ postMessage (32ms frames)
       ▼
┌──────────────────┐
│   Main Thread    │
│                  │
│  ┌────────────┐  │
│  │ Silero V5  │  │ ◄── ONNX inference
│  │   Model    │  │     Returns probability
│  └─────┬──────┘  │
│        │         │
│        ▼         │
│  ┌────────────┐  │
│  │   Frame    │  │ ◄── State machine
│  │ Processor  │  │     Speech detection logic
│  └─────┬──────┘  │
│        │         │
│        ▼         │
│   Event Emitter  │ ◄── User callbacks
└──────────────────┘
```

## 💡 Usage Examples

### Basic Speech Detection

```typescript
const vad = new TSVAD({ silero });

vad.on('speech-end', async (audio) => {
  // Send to speech-to-text API
  const transcript = await transcribe(audio);
  console.log('Transcript:', transcript);
});

await vad.start(audioContext, stream);
```

### Real-time Visualization

```typescript
vad.on('frame-processed', (probability, frame) => {
  // Update UI with speech probability
  updateMeter(probability);

  // Draw waveform
  drawWaveform(frame);
});
```

### Push-to-Talk with Auto-Detection

```typescript
let manualMode = false;

button.addEventListener('mousedown', () => {
  manualMode = true;
  vad.setOptions({ positiveSpeechThreshold: 0.1 }); // Very sensitive
});

button.addEventListener('mouseup', () => {
  manualMode = false;
  vad.setOptions({ positiveSpeechThreshold: 0.3 }); // Normal
});

vad.on('speech-end', (audio) => {
  if (manualMode) {
    // Process push-to-talk audio
  } else {
    // Process auto-detected audio
  }
});
```

### Recording with Pre-roll

```typescript
// Capture 800ms of audio before speech starts
const vad = new TSVAD({
  silero,
  preSpeechPadMs: 800  // Pre-roll buffer
});

vad.on('speech-end', (audio) => {
  // audio includes 800ms before speech started
  saveRecording(audio);
});
```

### Adaptive Thresholds (Noisy Environment)

```typescript
const vad = new TSVAD({ silero });
let noiseLevel = 0;

vad.on('frame-processed', (probability) => {
  // Track baseline noise
  if (!vad.getState() === 'running') {
    noiseLevel = Math.max(noiseLevel * 0.99, probability);
  }
});

// Adjust threshold based on ambient noise
setInterval(() => {
  const threshold = Math.max(0.3, noiseLevel + 0.15);
  vad.setOptions({ positiveSpeechThreshold: threshold });
}, 5000);
```

## 🔧 Configuration Reference

| Parameter | Default | Description |
|-----------|---------|-------------|
| `positiveSpeechThreshold` | 0.3 | Probability threshold to detect speech start (0-1) |
| `negativeSpeechThreshold` | 0.25 | Probability threshold to detect silence (0-1) |
| `redemptionMs` | 1400 | Grace period before declaring speech ended (ms) |
| `preSpeechPadMs` | 800 | Duration of pre-speech audio to include (ms) |
| `minSpeechMs` | 400 | Minimum valid speech duration (shorter = ignored) |

### Tuning Tips

**More Sensitive (catches quiet speech):**
```typescript
{ positiveSpeechThreshold: 0.2, negativeSpeechThreshold: 0.15 }
```

**Less Sensitive (reduces false positives):**
```typescript
{ positiveSpeechThreshold: 0.5, negativeSpeechThreshold: 0.4 }
```

**Faster Response (quicker speech-end):**
```typescript
{ redemptionMs: 800 }
```

**Longer Phrases (waits longer before speech-end):**
```typescript
{ redemptionMs: 2000 }
```

## 🎯 Performance

- **Latency**: ~32ms per frame (Silero V5)
- **CPU Usage**: Minimal (AudioWorklet + WASM)
- **Memory**: ~10MB (model + buffers)
- **Supported Sample Rates**: Any (auto-resampled to 16kHz)

## 🌐 Browser Support

| Browser | Version | Notes |
|---------|---------|-------|
| Chrome | 66+ | ✅ Full support |
| Firefox | 76+ | ✅ Full support |
| Safari | 14.1+ | ✅ Full support |
| Edge | 79+ | ✅ Full support |

Requires AudioWorklet support. Check compatibility:
```typescript
if (!('audioWorklet' in AudioContext.prototype)) {
  console.error('AudioWorklet not supported');
}
```

## 🐛 Troubleshooting

### "AudioWorklet not supported"
- Use a modern browser (see Browser Support)
- Ensure page is served over HTTPS (required for getUserMedia)

### High CPU usage
- Reduce `frame-processed` event listeners
- Avoid heavy processing in event callbacks
- Use `requestIdleCallback` for non-critical work

### False positives
- Increase `positiveSpeechThreshold` (e.g., 0.4-0.5)
- Increase `minSpeechMs` (e.g., 600-800)

### Missing speech starts
- Decrease `positiveSpeechThreshold` (e.g., 0.2-0.25)
- Increase `preSpeechPadMs` to capture more context

### Speech-end fires too quickly
- Increase `redemptionMs` (e.g., 2000-3000)

## 📁 Project Structure

```
ts_vad/
├── src/
│   ├── index.ts              # Public API exports
│   ├── ts-vad.ts             # Main TSVAD class
│   ├── types.ts              # TypeScript interfaces
│   ├── events.ts             # Event emitter implementation
│   ├── frame-processor.ts    # Speech detection state machine
│   ├── resampler.ts          # Audio resampling algorithm
│   ├── model.ts              # Silero V5 ONNX wrapper
│   └── worklet.ts            # AudioWorklet processor code
├── docs/
│   ├── ARCHITECTURE.md       # System architecture
│   ├── API.md                # API reference
│   ├── EXAMPLES.md           # Usage examples
│   └── GUIDE.md              # Implementation guide
├── tsconfig.json
├── package.json
└── README.md
```

## 🤝 Contributing

Contributions welcome! This is a minimal, focused library - please keep PRs aligned with the core goals:
- Simplicity
- Modularity
- Type safety
- Zero runtime dependencies (except onnxruntime-web)

## 📄 License

ISC

## 🙏 Acknowledgments

- [Silero VAD](https://github.com/snakers4/silero-vad) - The ML model
- [ONNX Runtime](https://github.com/microsoft/onnxruntime) - Inference engine
- [@ricky0123/vad](https://github.com/ricky0123/vad) - Inspiration

## 🔗 Related Projects

- **[@ricky0123/vad-web](https://github.com/ricky0123/vad)** - Full-featured VAD library
- **[Silero Models](https://github.com/snakers4/silero-models)** - Pre-trained models
- **[Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)** - Browser speech recognition

---

**Built with ❤️ for real-time speech applications**
