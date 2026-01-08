# TS_VAD Quick Reference

One-page cheat sheet for TS_VAD.

## Installation

```bash
cd ts_vad && npm install && npm run build
```

## Minimal Example

### Using .on() method
```typescript
import { TSVAD } from './ts_vad/src';
import * as ort from 'onnxruntime-web';

// Load model
const modelBuffer = await fetch('/silero_vad_v5.onnx').then(r => r.arrayBuffer());
const silero = await ort.InferenceSession.create(modelBuffer);

// Create VAD
const vad = new TSVAD({ silero });

// Listen for speech
vad.on('speech-end', (audio: Float32Array) => {
  console.log('Captured', audio.length, 'samples @16kHz');
});

// Start (handles getUserMedia internally)
await vad.start();
```

### Using constructor handlers
```typescript
import { TSVAD } from './ts_vad/src';
import * as ort from 'onnxruntime-web';

// Load model
const modelBuffer = await fetch('/silero_vad_v5.onnx').then(r => r.arrayBuffer());
const silero = await ort.InferenceSession.create(modelBuffer);

// Create VAD with handlers in constructor
const vad = new TSVAD({
  silero,
  onSpeechEnd: (audio: Float32Array) => {
    console.log('Captured', audio.length, 'samples @16kHz');
  },
});

// Start (handles getUserMedia internally)
await vad.start();
```

## API Quick Reference

### Constructor
```typescript
new TSVAD(options: TSVADOptions)
```

### Methods
| Method | Description |
|--------|-------------|
| `start()` | Start VAD (handles getUserMedia internally) |
| `pause()` | Pause (keeps resources) |
| `stop()` | Stop and cleanup |
| `setOptions(options)` | Update config |
| `getState()` | Get state |
| `on(event, callback)` | Add listener |
| `off(event, callback)` | Remove listener |

### Events
| Event | Callback | Fires When |
|-------|----------|------------|
| `speech-start` | `() => void` | Speech begins |
| `speech-end` | `(audio: Float32Array) => void` | Speech ends |
| `frame-processed` | `(prob: number, frame: Float32Array) => void` | Every 32ms |
| `error` | `(error: Error) => void` | Error occurs |

### Options
| Option | Default | Range | Description |
|--------|---------|-------|-------------|
| `silero` | - | - | Pre-loaded ONNX InferenceSession (required) |
| `positiveSpeechThreshold` | 0.3 | 0.1-0.6 | Speech start threshold |
| `negativeSpeechThreshold` | 0.25 | 0.05-0.55 | Silence threshold |
| `redemptionMs` | 1400 | 500-3000 | Grace period |
| `preSpeechPadMs` | 800 | 200-2000 | Pre-roll duration |
| `minSpeechMs` | 400 | 200-1500 | Minimum speech |
| `onSpeechStart` | - | - | Optional handler for speech-start event |
| `onSpeechEnd` | - | - | Optional handler for speech-end event |
| `onFrameProcessed` | - | - | Optional handler for frame-processed event |
| `onError` | - | - | Optional handler for error event |

## Common Patterns

### Basic Speech-to-Text
```typescript
vad.on('speech-end', async (audio) => {
  const text = await transcribe(audio);
  console.log('Transcript:', text);
});
```

### Visual Feedback
```typescript
vad.on('speech-start', () => indicator.classList.add('active'));
vad.on('speech-end', () => indicator.classList.remove('active'));
```

### Real-time Probability
```typescript
vad.on('frame-processed', (probability) => {
  meter.style.width = `${probability * 100}%`;
});
```

### Error Handling
```typescript
vad.on('error', (error) => {
  console.error('VAD error:', error);
  // Optionally restart
});
```

## Configuration Presets

### Voice Commands (Quick Response)
```typescript
{
  positiveSpeechThreshold: 0.35,
  negativeSpeechThreshold: 0.30,
  redemptionMs: 800,
  preSpeechPadMs: 500,
  minSpeechMs: 300
}
```

### Dictation (Natural Speech)
```typescript
{
  positiveSpeechThreshold: 0.3,
  negativeSpeechThreshold: 0.25,
  redemptionMs: 1400,
  preSpeechPadMs: 800,
  minSpeechMs: 500
}
```

### Noisy Environment
```typescript
{
  positiveSpeechThreshold: 0.5,
  negativeSpeechThreshold: 0.4,
  redemptionMs: 1200,
  preSpeechPadMs: 600,
  minSpeechMs: 600
}
```

### Quiet Environment
```typescript
{
  positiveSpeechThreshold: 0.2,
  negativeSpeechThreshold: 0.15,
  redemptionMs: 1600,
  preSpeechPadMs: 1000,
  minSpeechMs: 400
}
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| AudioWorklet not supported | Use Chrome 66+, Firefox 76+, Safari 14.1+ |
| Model fails to load | Check path, CORS, network |
| High CPU usage | Throttle `frame-processed` listeners |
| Speech not detected | Lower `positiveSpeechThreshold` |
| Too many false positives | Raise `positiveSpeechThreshold`, increase `minSpeechMs` |
| getUserMedia fails | Use HTTPS (or localhost) |

## Performance Tips

1. **Throttle UI Updates**: Update at most 10-20 FPS
2. **Use requestAnimationFrame**: Sync with display
3. **Minimize frame-processed listeners**: Most expensive event
4. **Use Web Workers**: For heavy processing
5. **Cleanup on unmount**: Stop VAD, stop tracks, close context

## Browser Compatibility

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 66+ |
| Firefox | 76+ |
| Safari | 14.1+ |
| Edge | 79+ |

**Requires**: HTTPS (except localhost)

## File Sizes

- Silero V5 model: ~9 MB
- TS_VAD library: ~30 KB (minified)
- ONNX Runtime WASM: ~5 MB

## Audio Format

**Input**: Any sample rate (auto-resampled)
**Output**: 16kHz mono Float32Array (-1.0 to 1.0)

## Resources

- [Full Documentation](./README.md)
- [Architecture Guide](./docs/ARCHITECTURE.md)
- [API Reference](./docs/API.md)
- [Usage Examples](./docs/EXAMPLES.md)
- [Implementation Guide](./docs/GUIDE.md)

---

**Quick Start**: Copy this code, adjust thresholds, and you're ready!
