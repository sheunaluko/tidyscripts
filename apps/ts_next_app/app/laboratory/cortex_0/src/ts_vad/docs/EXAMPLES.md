# TS_VAD Usage Examples

Real-world implementation examples for common use cases.

## Table of Contents

- [Basic Speech Recognition](#basic-speech-recognition)
- [Voice Commands](#voice-commands)
- [Real-time Transcription](#real-time-transcription)
- [Audio Recording](#audio-recording)
- [Visual Feedback](#visual-feedback)
- [Push-to-Talk](#push-to-talk)
- [Meeting Transcription](#meeting-transcription)
- [Adaptive Noise Handling](#adaptive-noise-handling)
- [Custom Audio Processing](#custom-audio-processing)
- [React Integration](#react-integration)

## Basic Speech Recognition

Simple speech-to-text application.

```typescript
import { TSVAD } from 'ts_vad';
import * as ort from 'onnxruntime-web';

class SpeechRecognizer {
  private vad: TSVAD;

  async initialize() {
    // Load Silero model
    const modelBuffer = await fetch('/silero_vad_v5.onnx')
      .then(r => r.arrayBuffer());
    const silero = await ort.InferenceSession.create(modelBuffer);

    // Create VAD
    this.vad = new TSVAD({ silero });

    // Handle speech end
    this.vad.on('speech-end', async (audio) => {
      const text = await this.transcribe(audio);
      this.displayTranscript(text);
    });

    // Start listening
    const ctx = new AudioContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await this.vad.start(ctx, stream);

    console.log('🎤 Listening for speech...');
  }

  private async transcribe(audio: Float32Array): Promise<string> {
    // Convert Float32Array to WAV blob
    const wav = this.float32ToWav(audio, 16000);

    // Send to speech recognition API (example: OpenAI Whisper)
    const formData = new FormData();
    formData.append('file', wav, 'audio.wav');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      },
      body: formData
    });

    const result = await response.json();
    return result.text;
  }

  private displayTranscript(text: string) {
    const div = document.createElement('div');
    div.textContent = text;
    document.getElementById('transcripts').appendChild(div);
  }

  private float32ToWav(buffer: Float32Array, sampleRate: number): Blob {
    const length = buffer.length * 2;
    const wav = new ArrayBuffer(44 + length);
    const view = new DataView(wav);

    // Write WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, length, true);

    // Write audio data
    const offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      view.setInt16(offset + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([wav], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

// Usage
const recognizer = new SpeechRecognizer();
recognizer.initialize();
```

## Voice Commands

Wake word detection and command recognition.

```typescript
class VoiceCommands {
  private vad: TSVAD;
  private commands = new Map<string, Function>();

  constructor(silero: ort.InferenceSession) {
    this.vad = new TSVAD({
      silero,
      minSpeechMs: 300,  // Commands are usually short
      redemptionMs: 800   // Quick response
    });

    this.setupCommands();
    this.setupListeners();
  }

  private setupCommands() {
    this.commands.set('turn on the lights', () => {
      console.log('💡 Lights on');
      this.controlLights(true);
    });

    this.commands.set('turn off the lights', () => {
      console.log('💡 Lights off');
      this.controlLights(false);
    });

    this.commands.set('play music', () => {
      console.log('🎵 Playing music');
      this.playMusic();
    });

    this.commands.set('stop', () => {
      console.log('⏹️ Stopping');
      this.stopMusic();
    });
  }

  private setupListeners() {
    this.vad.on('speech-start', () => {
      this.showListening();
    });

    this.vad.on('speech-end', async (audio) => {
      this.showProcessing();

      try {
        // Transcribe
        const text = await this.transcribe(audio);
        console.log('Heard:', text);

        // Match command
        const command = this.matchCommand(text.toLowerCase());
        if (command) {
          command();
          this.showSuccess();
        } else {
          this.showError('Command not recognized');
        }
      } catch (error) {
        this.showError('Recognition failed');
      }
    });
  }

  private matchCommand(text: string): Function | null {
    // Exact match
    if (this.commands.has(text)) {
      return this.commands.get(text)!;
    }

    // Fuzzy match (simple contains)
    for (const [command, fn] of this.commands) {
      if (text.includes(command) || command.includes(text)) {
        return fn;
      }
    }

    return null;
  }

  private showListening() {
    document.getElementById('status').textContent = '🎤 Listening...';
    document.getElementById('status').className = 'listening';
  }

  private showProcessing() {
    document.getElementById('status').textContent = '⚙️ Processing...';
    document.getElementById('status').className = 'processing';
  }

  private showSuccess() {
    document.getElementById('status').textContent = '✅ Done';
    document.getElementById('status').className = 'success';
    setTimeout(() => this.showReady(), 2000);
  }

  private showError(msg: string) {
    document.getElementById('status').textContent = `❌ ${msg}`;
    document.getElementById('status').className = 'error';
    setTimeout(() => this.showReady(), 2000);
  }

  private showReady() {
    document.getElementById('status').textContent = '👋 Say a command';
    document.getElementById('status').className = 'ready';
  }

  async start() {
    const ctx = new AudioContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await this.vad.start(ctx, stream);
    this.showReady();
  }

  // Stub methods
  private async transcribe(audio: Float32Array): Promise<string> {
    // Implement your transcription logic
    return '';
  }
  private controlLights(on: boolean) {}
  private playMusic() {}
  private stopMusic() {}
}
```

## Real-time Transcription

Live captions for meetings or presentations.

```typescript
class LiveTranscription {
  private vad: TSVAD;
  private currentTranscript = '';
  private interimElement: HTMLElement;
  private finalElement: HTMLElement;

  constructor(silero: ort.InferenceSession) {
    this.vad = new TSVAD({
      silero,
      preSpeechPadMs: 1000,   // Longer pre-roll for context
      redemptionMs: 2000,      // Wait longer for pauses
      minSpeechMs: 500         // Filter out short noises
    });

    this.interimElement = document.getElementById('interim')!;
    this.finalElement = document.getElementById('final')!;
    this.setupListeners();
  }

  private setupListeners() {
    this.vad.on('speech-start', () => {
      this.interimElement.textContent = '...';
      this.interimElement.style.display = 'block';
    });

    this.vad.on('speech-end', async (audio) => {
      try {
        const text = await this.transcribe(audio);

        // Add to final transcript
        this.currentTranscript += text + ' ';
        this.finalElement.textContent = this.currentTranscript;

        // Clear interim
        this.interimElement.style.display = 'none';

        // Auto-scroll
        this.finalElement.scrollTop = this.finalElement.scrollHeight;

        // Save to server
        this.saveTranscript(text);
      } catch (error) {
        console.error('Transcription error:', error);
      }
    });

    this.vad.on('frame-processed', (probability) => {
      // Show interim confidence
      if (probability > 0.3) {
        const dots = '.'.repeat(Math.floor(probability * 5));
        this.interimElement.textContent = dots;
      }
    });
  }

  async start() {
    const ctx = new AudioContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await this.vad.start(ctx, stream);
    console.log('🎤 Live transcription started');
  }

  stop() {
    this.vad.stop();
    this.downloadTranscript();
  }

  private async transcribe(audio: Float32Array): Promise<string> {
    // Your transcription implementation
    return '';
  }

  private saveTranscript(text: string) {
    fetch('/api/transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, timestamp: Date.now() })
    });
  }

  private downloadTranscript() {
    const blob = new Blob([this.currentTranscript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${Date.now()}.txt`;
    a.click();
  }
}
```

## Audio Recording

Record only speech segments (skip silence).

```typescript
class SpeechRecorder {
  private vad: TSVAD;
  private recordings: Float32Array[] = [];

  constructor(silero: ort.InferenceSession) {
    this.vad = new TSVAD({ silero });

    this.vad.on('speech-end', (audio) => {
      this.recordings.push(audio);
      this.updateUI();
    });
  }

  async startRecording() {
    const ctx = new AudioContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await this.vad.start(ctx, stream);
    console.log('🔴 Recording...');
  }

  stopRecording() {
    this.vad.stop();
    console.log('⏹️ Stopped');
  }

  exportRecording(): Blob {
    // Concatenate all speech segments
    const totalLength = this.recordings.reduce((sum, arr) => sum + arr.length, 0);
    const combined = new Float32Array(totalLength);

    let offset = 0;
    for (const recording of this.recordings) {
      combined.set(recording, offset);
      offset += recording.length;
    }

    // Convert to WAV
    return this.float32ToWav(combined, 16000);
  }

  clearRecordings() {
    this.recordings = [];
    this.updateUI();
  }

  private updateUI() {
    const duration = this.recordings.reduce(
      (sum, arr) => sum + arr.length / 16000,
      0
    );
    document.getElementById('duration').textContent =
      `${Math.round(duration)}s recorded (${this.recordings.length} segments)`;
  }

  private float32ToWav(buffer: Float32Array, sampleRate: number): Blob {
    // Implementation from Basic Speech Recognition example
    // ...
    return new Blob([], { type: 'audio/wav' });
  }
}

// Usage
const recorder = new SpeechRecorder(sileroSession);

document.getElementById('start').addEventListener('click', () => {
  recorder.startRecording();
});

document.getElementById('stop').addEventListener('click', () => {
  recorder.stopRecording();
});

document.getElementById('export').addEventListener('click', () => {
  const wav = recorder.exportRecording();
  const url = URL.createObjectURL(wav);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'recording.wav';
  a.click();
});
```

## Visual Feedback

Real-time audio visualization.

```typescript
class VoiceVisualizer {
  private vad: TSVAD;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private history: number[] = [];
  private maxHistory = 100;

  constructor(silero: ort.InferenceSession) {
    this.vad = new TSVAD({ silero });
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.setupListeners();
    this.startAnimation();
  }

  private setupListeners() {
    let isSpeaking = false;

    this.vad.on('speech-start', () => {
      isSpeaking = true;
      this.canvas.classList.add('speaking');
    });

    this.vad.on('speech-end', () => {
      isSpeaking = false;
      this.canvas.classList.remove('speaking');
    });

    this.vad.on('frame-processed', (probability, frame) => {
      // Update probability history
      this.history.push(probability);
      if (this.history.length > this.maxHistory) {
        this.history.shift();
      }

      // Update status text
      document.getElementById('probability').textContent =
        `${(probability * 100).toFixed(1)}%`;
    });
  }

  private startAnimation() {
    const animate = () => {
      this.draw();
      requestAnimationFrame(animate);
    };
    animate();
  }

  private draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Draw probability graph
    this.ctx.strokeStyle = '#4CAF50';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();

    const xStep = width / this.maxHistory;
    this.history.forEach((prob, i) => {
      const x = i * xStep;
      const y = height - (prob * height);

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });

    this.ctx.stroke();

    // Draw threshold lines
    const posY = height - (0.3 * height);
    const negY = height - (0.25 * height);

    this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(0, posY);
    this.ctx.lineTo(width, posY);
    this.ctx.stroke();

    this.ctx.strokeStyle = 'rgba(0, 0, 255, 0.3)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, negY);
    this.ctx.lineTo(width, negY);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  async start() {
    const ctx = new AudioContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await this.vad.start(ctx, stream);
  }
}
```

## Push-to-Talk

Manual trigger with VAD assistance.

```typescript
class PushToTalk {
  private vad: TSVAD;
  private isManualMode = false;
  private button: HTMLButtonElement;

  constructor(silero: ort.InferenceSession) {
    this.vad = new TSVAD({
      silero,
      positiveSpeechThreshold: 0.3  // Normal sensitivity
    });

    this.button = document.getElementById('ptt-button') as HTMLButtonElement;
    this.setupButton();
    this.setupVAD();
  }

  private setupButton() {
    this.button.addEventListener('mousedown', () => {
      this.startManualMode();
    });

    this.button.addEventListener('mouseup', () => {
      this.stopManualMode();
    });

    // Also handle spacebar
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !this.isManualMode) {
        e.preventDefault();
        this.startManualMode();
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.stopManualMode();
      }
    });
  }

  private setupVAD() {
    this.vad.on('speech-end', (audio) => {
      if (this.isManualMode) {
        console.log('📣 Manual speech captured');
      } else {
        console.log('🎤 Auto-detected speech');
      }
      this.processAudio(audio);
    });
  }

  private startManualMode() {
    this.isManualMode = true;
    this.button.classList.add('active');

    // Make very sensitive during manual mode
    this.vad.setOptions({
      positiveSpeechThreshold: 0.1,
      negativeSpeechThreshold: 0.05,
      redemptionMs: 500  // Quicker response
    });

    console.log('🔴 Push-to-talk active');
  }

  private stopManualMode() {
    this.isManualMode = false;
    this.button.classList.remove('active');

    // Return to normal sensitivity
    this.vad.setOptions({
      positiveSpeechThreshold: 0.3,
      negativeSpeechThreshold: 0.25,
      redemptionMs: 1400
    });

    console.log('⚪ Push-to-talk released');
  }

  private async processAudio(audio: Float32Array) {
    // Send to your backend
    const wav = this.float32ToWav(audio, 16000);
    const formData = new FormData();
    formData.append('audio', wav);
    formData.append('manual', String(this.isManualMode));

    await fetch('/api/audio', {
      method: 'POST',
      body: formData
    });
  }

  async start() {
    const ctx = new AudioContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await this.vad.start(ctx, stream);
    console.log('🎤 PTT ready (hold button or spacebar to talk)');
  }

  private float32ToWav(buffer: Float32Array, sampleRate: number): Blob {
    // Implementation from Basic Speech Recognition example
    // ...
    return new Blob([], { type: 'audio/wav' });
  }
}
```

## Meeting Transcription

Multi-speaker meeting recorder.

```typescript
class MeetingRecorder {
  private vad: TSVAD;
  private segments: Array<{ audio: Float32Array, timestamp: number }> = [];
  private startTime: number = 0;

  constructor(silero: ort.InferenceSession) {
    this.vad = new TSVAD({
      silero,
      preSpeechPadMs: 1000,
      redemptionMs: 2000,
      minSpeechMs: 800  // Longer minimum for meaningful speech
    });

    this.setupVAD();
  }

  private setupVAD() {
    this.vad.on('speech-start', () => {
      console.log(`[${this.getTimestamp()}] 🎤 Speaker started`);
    });

    this.vad.on('speech-end', (audio) => {
      const timestamp = Date.now() - this.startTime;
      this.segments.push({ audio, timestamp });

      console.log(
        `[${this.getTimestamp()}] ✅ Captured ${(audio.length / 16000).toFixed(1)}s`
      );

      // Transcribe in background
      this.transcribeSegment(audio, timestamp);
    });
  }

  async startMeeting() {
    this.startTime = Date.now();
    const ctx = new AudioContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await this.vad.start(ctx, stream);
    console.log('🎤 Meeting recording started');
  }

  stopMeeting() {
    this.vad.stop();
    console.log('⏹️ Meeting recording stopped');
    this.exportMeeting();
  }

  private async transcribeSegment(audio: Float32Array, timestamp: number) {
    try {
      const text = await this.transcribe(audio);

      // Save to transcript
      this.saveTranscript({
        text,
        timestamp,
        duration: audio.length / 16000
      });

      // Display
      this.displaySegment(text, timestamp);
    } catch (error) {
      console.error('Transcription error:', error);
    }
  }

  private displaySegment(text: string, timestamp: number) {
    const div = document.createElement('div');
    div.className = 'transcript-segment';
    div.innerHTML = `
      <span class="timestamp">${this.getTimestamp(timestamp)}</span>
      <span class="text">${text}</span>
    `;
    document.getElementById('transcript').appendChild(div);
  }

  private getTimestamp(ts?: number): string {
    const elapsed = (ts || (Date.now() - this.startTime)) / 1000;
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private async exportMeeting() {
    // Combine all audio segments
    const combined = this.combineSegments();

    // Create ZIP with audio + transcript
    const zip = await this.createZip(combined);

    // Download
    const url = URL.createObjectURL(zip);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-${Date.now()}.zip`;
    a.click();
  }

  private combineSegments(): Float32Array {
    const totalLength = this.segments.reduce(
      (sum, seg) => sum + seg.audio.length,
      0
    );
    const combined = new Float32Array(totalLength);

    let offset = 0;
    for (const segment of this.segments) {
      combined.set(segment.audio, offset);
      offset += segment.audio.length;
    }

    return combined;
  }

  // Stub methods
  private async transcribe(audio: Float32Array): Promise<string> { return ''; }
  private saveTranscript(data: any) {}
  private async createZip(audio: Float32Array): Promise<Blob> { return new Blob(); }
}
```

## Adaptive Noise Handling

Automatically adjust to noisy environments.

```typescript
class AdaptiveVAD {
  private vad: TSVAD;
  private noiseProfile: number[] = [];
  private calibrating = true;
  private calibrationFrames = 0;
  private readonly CALIBRATION_COUNT = 100;  // ~3 seconds

  constructor(silero: ort.InferenceSession) {
    this.vad = new TSVAD({ silero });
    this.setupAdaptation();
  }

  private setupAdaptation() {
    this.vad.on('frame-processed', (probability) => {
      if (this.calibrating) {
        this.calibrate(probability);
      } else {
        this.adapt(probability);
      }
    });
  }

  private calibrate(probability: number) {
    this.noiseProfile.push(probability);
    this.calibrationFrames++;

    if (this.calibrationFrames >= this.CALIBRATION_COUNT) {
      this.finishCalibration();
    }

    // Show progress
    const progress = (this.calibrationFrames / this.CALIBRATION_COUNT) * 100;
    document.getElementById('calibration').textContent =
      `Calibrating... ${Math.round(progress)}%`;
  }

  private finishCalibration() {
    this.calibrating = false;

    // Calculate noise baseline (90th percentile)
    const sorted = [...this.noiseProfile].sort((a, b) => a - b);
    const baseline = sorted[Math.floor(sorted.length * 0.9)];

    console.log(`Noise baseline: ${baseline.toFixed(3)}`);

    // Set thresholds above baseline
    const posThreshold = Math.max(0.3, baseline + 0.15);
    const negThreshold = Math.max(0.25, baseline + 0.10);

    this.vad.setOptions({
      positiveSpeechThreshold: posThreshold,
      negativeSpeechThreshold: negThreshold
    });

    document.getElementById('calibration').textContent =
      `✅ Calibrated (threshold: ${posThreshold.toFixed(2)})`;

    console.log('🎯 VAD calibrated and ready');
  }

  private adapt(probability: number) {
    // Continuously update noise profile (slow decay)
    if (!this.vad.getState()) {  // Only when not speaking
      this.noiseProfile.push(probability);
      if (this.noiseProfile.length > 1000) {
        this.noiseProfile.shift();
      }

      // Recalibrate every 5 seconds
      if (this.noiseProfile.length % 150 === 0) {
        this.recalibrate();
      }
    }
  }

  private recalibrate() {
    const sorted = [...this.noiseProfile].sort((a, b) => a - b);
    const baseline = sorted[Math.floor(sorted.length * 0.9)];

    const posThreshold = Math.max(0.3, baseline + 0.15);
    const negThreshold = Math.max(0.25, baseline + 0.10);

    this.vad.setOptions({
      positiveSpeechThreshold: posThreshold,
      negativeSpeechThreshold: negThreshold
    });

    console.log(`♻️ Recalibrated (baseline: ${baseline.toFixed(3)})`);
  }

  async start() {
    const ctx = new AudioContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await this.vad.start(ctx, stream);
    console.log('🎤 Please remain silent for 3 seconds...');
  }
}
```

## React Integration

VAD as a React hook.

```typescript
import { useState, useEffect, useRef } from 'react';
import { TSVAD } from 'ts_vad';
import * as ort from 'onnxruntime-web';

interface UseVADOptions {
  onSpeechStart?: () => void;
  onSpeechEnd?: (audio: Float32Array) => void;
  onError?: (error: Error) => void;
}

function useVAD(options: UseVADOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [probability, setProbability] = useState(0);
  const vadRef = useRef<TSVAD | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        // Load model
        const modelBuffer = await fetch('/silero_vad_v5.onnx')
          .then(r => r.arrayBuffer());
        const silero = await ort.InferenceSession.create(modelBuffer);

        if (!mounted) return;

        // Create VAD
        const vad = new TSVAD({ silero });

        // Setup listeners
        vad.on('speech-start', () => {
          setIsListening(true);
          options.onSpeechStart?.();
        });

        vad.on('speech-end', (audio) => {
          setIsListening(false);
          options.onSpeechEnd?.(audio);
        });

        vad.on('frame-processed', (prob) => {
          setProbability(prob);
        });

        vad.on('error', (error) => {
          options.onError?.(error);
        });

        vadRef.current = vad;
      } catch (error) {
        console.error('VAD initialization error:', error);
        options.onError?.(error as Error);
      }
    }

    initialize();

    return () => {
      mounted = false;
      vadRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const start = async () => {
    if (!vadRef.current) return;

    const ctx = new AudioContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    await vadRef.current.start(ctx, stream);
  };

  const stop = () => {
    vadRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  return {
    start,
    stop,
    isListening,
    probability,
    vad: vadRef.current
  };
}

// Usage in component
function VoiceApp() {
  const [transcript, setTranscript] = useState('');

  const { start, stop, isListening, probability } = useVAD({
    onSpeechEnd: async (audio) => {
      const text = await transcribe(audio);
      setTranscript(prev => prev + ' ' + text);
    },
    onError: (error) => {
      console.error('VAD error:', error);
    }
  });

  return (
    <div>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>

      <div className={isListening ? 'listening' : 'idle'}>
        {isListening ? '🎤 Listening...' : '⚪ Idle'}
      </div>

      <div>
        Probability: {(probability * 100).toFixed(1)}%
      </div>

      <div className="transcript">
        {transcript}
      </div>
    </div>
  );
}

async function transcribe(audio: Float32Array): Promise<string> {
  // Your transcription implementation
  return '';
}
```

---

**Need more examples?** Check out the [API Reference](./API.md) and [Architecture Guide](./ARCHITECTURE.md) for deeper implementation details.
