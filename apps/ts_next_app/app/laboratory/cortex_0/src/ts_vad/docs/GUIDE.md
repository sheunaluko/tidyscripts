# TS_VAD Implementation Guide

Step-by-step guide to integrating TS_VAD into your application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Basic Setup](#basic-setup)
- [Configuration](#configuration)
- [Advanced Integration](#advanced-integration)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)
- [Performance Optimization](#performance-optimization)

## Prerequisites

### Browser Requirements

- Modern browser with AudioWorklet support:
  - Chrome 66+
  - Firefox 76+
  - Safari 14.1+
  - Edge 79+

- HTTPS required (for `getUserMedia()`)

### Development Setup

- Node.js 16+ and npm
- TypeScript 5.0+
- Bundler (Webpack, Vite, Parcel, etc.)

### Files Needed

1. **Silero VAD v5 model**: Download from [Silero Models](https://github.com/snakers4/silero-vad)
2. **ONNX Runtime WASM files**: Bundled with `onnxruntime-web`

## Installation

### Step 1: Build TS_VAD

```bash
cd ts_vad
npm install
npm run build
```

This creates `dist/` folder with compiled JavaScript and TypeScript definitions.

### Step 2: Copy to Your Project

```bash
# Option A: Copy entire folder
cp -r ts_vad /path/to/your/project/

# Option B: Copy just the dist
cp -r ts_vad/dist /path/to/your/project/vendor/ts_vad
```

### Step 3: Install Dependencies

In your project:

```bash
npm install onnxruntime-web
```

## Basic Setup

### 1. Download Silero Model

```bash
# Download Silero VAD v5
curl -L -o public/silero_vad_v5.onnx \
  https://github.com/snakers4/silero-vad/raw/master/files/silero_vad_v5.onnx
```

Place in your `public/` or `static/` folder.

### 2. Import TS_VAD

```typescript
import { TSVAD } from './ts_vad/src';
import * as ort from 'onnxruntime-web';
```

### 3. Load Model

```typescript
async function loadModel(): Promise<ort.InferenceSession> {
  const modelBuffer = await fetch('/silero_vad_v5.onnx')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch model');
      }
      return response.arrayBuffer();
    });

  return await ort.InferenceSession.create(modelBuffer);
}
```

### 4. Create VAD Instance

```typescript
async function initializeVAD() {
  // Load model
  const silero = await loadModel();

  // Create VAD
  const vad = new TSVAD({
    silero,
    // Use defaults for other options
  });

  // Register event handlers
  vad.on('speech-start', () => {
    console.log('Speech started');
  });

  vad.on('speech-end', (audio: Float32Array) => {
    console.log('Speech ended', audio);
    // Process audio here
  });

  vad.on('error', (error: Error) => {
    console.error('VAD error:', error);
  });

  return vad;
}
```

### 5. Request Microphone Access

```typescript
async function requestMicrophone(): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        autoGainControl: true,
        noiseSuppression: true,
      }
    });
    return stream;
  } catch (error) {
    console.error('Microphone access denied:', error);
    throw error;
  }
}
```

### 6. Start VAD

```typescript
async function start() {
  const vad = await initializeVAD();
  const stream = await requestMicrophone();
  const audioContext = new AudioContext();

  await vad.start(audioContext, stream);
  console.log('VAD started');
}

// Call when ready
start();
```

## Configuration

### Understanding Parameters

#### `positiveSpeechThreshold` (default: 0.3)

Controls when speech is detected.

```typescript
// More sensitive (catches quiet speech, more false positives)
{ positiveSpeechThreshold: 0.2 }

// Less sensitive (misses quiet speech, fewer false positives)
{ positiveSpeechThreshold: 0.5 }

// Recommended range: 0.2 - 0.5
```

**Use cases:**
- **Quiet environment**: 0.2 - 0.3
- **Normal environment**: 0.3 - 0.4
- **Noisy environment**: 0.4 - 0.5

#### `negativeSpeechThreshold` (default: 0.25)

Controls when silence is detected.

```typescript
// Typically 0.05 below positiveSpeechThreshold
{
  positiveSpeechThreshold: 0.3,
  negativeSpeechThreshold: 0.25
}
```

**Rule of thumb:** `negative = positive - 0.05`

This creates **hysteresis** to prevent flickering.

#### `redemptionMs` (default: 1400)

Grace period before declaring speech ended.

```typescript
// Quick response (good for commands)
{ redemptionMs: 800 }

// Normal (good for natural speech)
{ redemptionMs: 1400 }

// Patient (good for slow speakers, pauses)
{ redemptionMs: 2500 }

// Recommended range: 800 - 3000
```

**Use cases:**
- **Voice commands**: 800 - 1000ms
- **Dictation**: 1400 - 2000ms
- **Presentations**: 2000 - 3000ms

#### `preSpeechPadMs` (default: 800)

Duration of audio before speech start to include.

```typescript
// Minimal context
{ preSpeechPadMs: 300 }

// Normal context (recommended)
{ preSpeechPadMs: 800 }

// Maximum context
{ preSpeechPadMs: 1500 }

// Recommended range: 300 - 1500
```

**Why it matters:** Captures the onset of speech that triggered detection.

#### `minSpeechMs` (default: 400)

Minimum valid speech duration.

```typescript
// Catch everything (more false positives)
{ minSpeechMs: 200 }

// Normal filtering
{ minSpeechMs: 400 }

// Strict filtering (only longer speech)
{ minSpeechMs: 800 }

// Recommended range: 300 - 1000
```

**Use cases:**
- **Voice commands**: 300 - 500ms
- **Transcription**: 400 - 600ms
- **Presentations**: 600 - 1000ms

### Configuration Presets

#### Preset 1: Voice Commands

```typescript
const vad = new TSVAD({
  silero,
  positiveSpeechThreshold: 0.35,  // Less sensitive
  negativeSpeechThreshold: 0.30,
  redemptionMs: 800,               // Quick response
  preSpeechPadMs: 500,
  minSpeechMs: 300                 // Allow short commands
});
```

#### Preset 2: Dictation

```typescript
const vad = new TSVAD({
  silero,
  positiveSpeechThreshold: 0.3,
  negativeSpeechThreshold: 0.25,
  redemptionMs: 1400,              // Normal pauses
  preSpeechPadMs: 800,
  minSpeechMs: 500
});
```

#### Preset 3: Noisy Environment

```typescript
const vad = new TSVAD({
  silero,
  positiveSpeechThreshold: 0.5,   // Much less sensitive
  negativeSpeechThreshold: 0.4,
  redemptionMs: 1200,
  preSpeechPadMs: 600,
  minSpeechMs: 600                 // Filter short noises
});
```

#### Preset 4: Quiet Environment

```typescript
const vad = new TSVAD({
  silero,
  positiveSpeechThreshold: 0.2,   // Very sensitive
  negativeSpeechThreshold: 0.15,
  redemptionMs: 1600,
  preSpeechPadMs: 1000,
  minSpeechMs: 400
});
```

## Advanced Integration

### Lifecycle Management

```typescript
class VADManager {
  private vad: TSVAD | null = null;
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;

  async initialize() {
    const silero = await this.loadModel();
    this.vad = new TSVAD({ silero });
    this.setupHandlers();
  }

  async start() {
    if (!this.vad) throw new Error('Not initialized');

    this.audioContext = new AudioContext();
    this.stream = await this.requestMicrophone();
    await this.vad.start(this.audioContext, this.stream);
  }

  pause() {
    this.vad?.pause();
  }

  resume() {
    if (!this.audioContext || !this.stream) {
      throw new Error('Cannot resume - not started');
    }
    this.vad?.start(this.audioContext, this.stream);
  }

  stop() {
    this.vad?.stop();
    this.stream?.getTracks().forEach(track => track.stop());
    this.audioContext?.close();
  }

  destroy() {
    this.stop();
    this.vad = null;
    this.stream = null;
    this.audioContext = null;
  }

  private setupHandlers() {
    // ... event handlers
  }

  private async loadModel() {
    // ... model loading
  }

  private async requestMicrophone() {
    // ... microphone request
  }
}
```

### Error Handling

```typescript
class RobustVAD {
  private vad: TSVAD;
  private retryCount = 0;
  private maxRetries = 3;

  constructor(silero: ort.InferenceSession) {
    this.vad = new TSVAD({ silero });
    this.setupErrorHandling();
  }

  private setupErrorHandling() {
    this.vad.on('error', async (error) => {
      console.error('VAD error:', error);

      // Classify error
      if (this.isRecoverableError(error)) {
        await this.attemptRecovery();
      } else {
        this.notifyUser('Fatal VAD error');
      }
    });
  }

  private isRecoverableError(error: Error): boolean {
    // Check if error is temporary
    return error.message.includes('inference') ||
           error.message.includes('timeout');
  }

  private async attemptRecovery() {
    if (this.retryCount >= this.maxRetries) {
      this.notifyUser('VAD recovery failed');
      return;
    }

    this.retryCount++;
    console.log(`Attempting recovery (${this.retryCount}/${this.maxRetries})`);

    // Stop and restart
    this.vad.stop();
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const ctx = new AudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await this.vad.start(ctx, stream);

      this.retryCount = 0;  // Reset on success
      console.log('Recovery successful');
    } catch (error) {
      console.error('Recovery failed:', error);
      await this.attemptRecovery();  // Retry
    }
  }

  private notifyUser(message: string) {
    // Show user-friendly notification
    alert(message);
  }
}
```

### State Management

```typescript
type VADState = 'uninitialized' | 'ready' | 'running' | 'paused' | 'error';

class StatefulVAD {
  private vad: TSVAD;
  private state: VADState = 'uninitialized';
  private listeners: Array<(state: VADState) => void> = [];

  constructor(silero: ort.InferenceSession) {
    this.vad = new TSVAD({ silero });
    this.setState('ready');
  }

  async start(ctx: AudioContext, stream: MediaStream) {
    if (this.state !== 'ready' && this.state !== 'paused') {
      throw new Error(`Cannot start from state: ${this.state}`);
    }

    await this.vad.start(ctx, stream);
    this.setState('running');
  }

  pause() {
    if (this.state !== 'running') return;

    this.vad.pause();
    this.setState('paused');
  }

  stop() {
    if (this.state === 'uninitialized' || this.state === 'ready') return;

    this.vad.stop();
    this.setState('ready');
  }

  onStateChange(listener: (state: VADState) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  private setState(newState: VADState) {
    this.state = newState;
    this.listeners.forEach(listener => listener(newState));
  }

  getState(): VADState {
    return this.state;
  }
}

// Usage
const vad = new StatefulVAD(sileroSession);

vad.onStateChange((state) => {
  console.log('VAD state changed:', state);
  updateUI(state);
});
```

## Production Deployment

### 1. Asset Hosting

#### Option A: CDN

```typescript
// Serve model from CDN
const modelUrl = 'https://cdn.example.com/silero_vad_v5.onnx';
const modelBuffer = await fetch(modelUrl).then(r => r.arrayBuffer());
```

**Pros:** Fast, cached, reduces server load
**Cons:** Privacy concerns, requires CORS

#### Option B: Self-Hosted

```typescript
// Serve from your domain
const modelUrl = '/models/silero_vad_v5.onnx';
const modelBuffer = await fetch(modelUrl).then(r => r.arrayBuffer());
```

**Pros:** Full control, privacy
**Cons:** Server bandwidth

### 2. Bundle Optimization

#### Webpack Configuration

```javascript
// webpack.config.js
module.exports = {
  entry: './src/index.ts',
  output: {
    filename: 'app.bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        // Copy ONNX Runtime WASM files
        {
          from: 'node_modules/onnxruntime-web/dist/*.wasm',
          to: '[name][ext]'
        },
        {
          from: 'node_modules/onnxruntime-web/dist/*.mjs',
          to: '[name][ext]'
        }
      ]
    })
  ]
};
```

#### Vite Configuration

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/onnxruntime-web/dist/*.wasm',
          dest: './'
        },
        {
          src: 'node_modules/onnxruntime-web/dist/*.mjs',
          dest: './'
        }
      ]
    })
  ]
});
```

### 3. Loading Optimization

#### Lazy Loading

```typescript
// Load model only when needed
async function lazyLoadVAD() {
  const { TSVAD } = await import('./ts_vad/src');
  const ort = await import('onnxruntime-web');

  const modelBuffer = await fetch('/silero_vad_v5.onnx')
    .then(r => r.arrayBuffer());

  const silero = await ort.InferenceSession.create(modelBuffer);
  return new TSVAD({ silero });
}

// Use when user clicks "Start Recording"
button.addEventListener('click', async () => {
  const vad = await lazyLoadVAD();
  // ... start VAD
});
```

#### Progress Feedback

```typescript
async function loadWithProgress() {
  const response = await fetch('/silero_vad_v5.onnx');
  const total = parseInt(response.headers.get('content-length') || '0');
  const reader = response.body!.getReader();

  let received = 0;
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    received += value.length;

    const progress = (received / total) * 100;
    updateProgressBar(progress);
  }

  const buffer = new Uint8Array(received);
  let position = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, position);
    position += chunk.length;
  }

  return buffer.buffer;
}
```

### 4. HTTPS Requirement

```nginx
# nginx configuration
server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        root /var/www/html;
        index index.html;
    }

    location /models/ {
        alias /var/www/models/;
        add_header Cache-Control "public, max-age=31536000";
    }
}
```

## Troubleshooting

### Common Issues

#### Issue 1: "AudioWorklet not supported"

**Cause:** Old browser or HTTP instead of HTTPS

**Solution:**
```typescript
if (!('audioWorklet' in AudioContext.prototype)) {
  alert('Please use a modern browser (Chrome 66+, Firefox 76+, Safari 14.1+)');
  return;
}

if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
  alert('VAD requires HTTPS');
  return;
}
```

#### Issue 2: Model load fails

**Cause:** CORS, wrong path, or network error

**Solution:**
```typescript
try {
  const response = await fetch('/silero_vad_v5.onnx');
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const modelBuffer = await response.arrayBuffer();
  // ... create session
} catch (error) {
  console.error('Model load failed:', error);
  alert('Failed to load VAD model. Please refresh the page.');
}
```

#### Issue 3: High CPU usage

**Cause:** Heavy event listeners

**Solution:**
```typescript
// Throttle frame-processed events
let lastUpdate = 0;
const THROTTLE_MS = 100;

vad.on('frame-processed', (probability, frame) => {
  const now = Date.now();
  if (now - lastUpdate < THROTTLE_MS) return;
  lastUpdate = now;

  // Update UI
  updateVisualization(probability);
});
```

#### Issue 4: Speech not detected

**Cause:** Threshold too high or microphone issue

**Solution:**
```typescript
// Test microphone
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const audioTrack = stream.getAudioTracks()[0];
console.log('Microphone:', audioTrack.label);
console.log('Settings:', audioTrack.getSettings());

// Lower threshold temporarily
vad.setOptions({
  positiveSpeechThreshold: 0.2,
  negativeSpeechThreshold: 0.15
});

// Monitor probabilities
vad.on('frame-processed', (probability) => {
  console.log('Probability:', probability.toFixed(3));
});
```

## Performance Optimization

### 1. Reduce Event Listeners

```typescript
// Bad: Heavy processing in every frame
vad.on('frame-processed', (prob, frame) => {
  updateWaveform(frame);  // 31 times per second!
  drawSpectrogram(frame);
  analyzeFrequencies(frame);
});

// Good: Throttle updates
let frameCount = 0;
vad.on('frame-processed', (prob, frame) => {
  if (++frameCount % 10 === 0) {  // Every 10th frame
    updateWaveform(frame);
  }
});
```

### 2. Use requestAnimationFrame

```typescript
let latestProbability = 0;

vad.on('frame-processed', (prob) => {
  latestProbability = prob;
  // Don't update DOM here!
});

// Update UI at display refresh rate
function animate() {
  updateMeter(latestProbability);
  requestAnimationFrame(animate);
}
animate();
```

### 3. Offload Heavy Work

```typescript
// Use Web Worker for heavy processing
const worker = new Worker('audio-processor.worker.js');

vad.on('speech-end', (audio) => {
  // Send to worker (transfer ownership)
  worker.postMessage(
    { audio: audio.buffer },
    [audio.buffer]
  );
});

worker.onmessage = (e) => {
  const result = e.data;
  // Display result
};
```

### 4. Cleanup Resources

```typescript
// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  vad.stop();
  stream.getTracks().forEach(track => track.stop());
  audioContext.close();
});

// Cleanup on SPA navigation
router.on('navigate', () => {
  vad.stop();
});
```

---

**Ready to integrate?** Check out [EXAMPLES.md](./EXAMPLES.md) for complete working examples!
