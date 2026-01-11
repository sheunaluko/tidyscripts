# Replace Voice Interface (VI) with Tivi in Cortex_0

## Overview

Replace all `tidyscripts_web.util.voice_interface` (vi) functionality in cortex_0 with the new tivi component. This will modernize the voice interface to use:
- VAD-triggered speech recognition (more efficient)
- Clean React hooks pattern
- Better TTS interruption handling
- No auto-restart issues

## Current State

Cortex_0 currently uses VI from tidyscripts_web for:
1. **TTS**: `vi.speak_with_rate(text, rate)` - Speaking AI responses
2. **TTS State**: `vi.tts.tts().speaking` - Checking if AI is speaking
3. **TTS Cancel**: `vi.tts.cancel_speech()` - Stopping speech on interrupt
4. **Recognition Pause**: `vi.pause_recognition()` - Pausing recognition after cancel
5. **Recognition Init**: `vi.initialize_recognition()` - Starting recognition system

## Target State

Replace with tivi hook which provides:
- `tivi.speak(text, rate)` - TTS with rate control
- `tivi.isSpeaking` - Boolean state for speaking status
- `tivi.cancelSpeech()` - Cancel current speech
- `tivi.startListening()` - Initialize VAD + recognition (replaces init + pause logic)
- Auto-pause recognition on speech end (no manual pause needed)

## Implementation Steps

### Step 1: Extend useTivi Hook with cancelSpeech Method

**File**: `/app/laboratory/components/tivi/lib/useTivi.ts`

**Current**: Hook doesn't expose cancelSpeech in return object

**Add**: Export cancelSpeech method from the hook

```typescript
const cancelSpeech = useCallback(() => {
  tts.cancelSpeech();
  setIsSpeaking(false);
}, []);

return {
  // ... existing returns ...
  speak,
  clearTranscription,
  cancelSpeech,  // NEW
};
```

**Location**: After line 345 (after clearTranscription), before return statement at line 352

**Why**: Cortex_0 needs to cancel speech when user interrupts with "stop" keyword or pause button

---

### Step 2: Update TypeScript Types

**File**: `/app/laboratory/components/tivi/lib/types.ts`

**Add to UseTiviReturn interface** (after line 115):
```typescript
/**
 * Cancel current speech immediately
 */
cancelSpeech: () => void;
```

---

### Step 3: Replace VI Import in Cortex_0

**File**: `/app/laboratory/cortex_0/app3.tsx`

**Current** (line 85):
```typescript
const vi = tsw.util.voice_interface;
```

**Replace with**:
```typescript
// Remove line 85 entirely
```

**Add import** (at top of file, around line 15-20):
```typescript
import { useTivi } from '../components/tivi/lib';
import type { UseTiviReturn } from '../components/tivi/lib/types';
```

---

### Step 4: Initialize Tivi Hook in Component

**File**: `/app/laboratory/cortex_0/app3.tsx`

**Location**: Inside Component function, after state declarations (around line 140)

**Add**:
```typescript
// Initialize tivi voice interface
const tivi = useTivi({
  onTranscription: async (text: string) => {
    // This is redundant with event listener but keeping for consistency
    log(`Tivi transcription: ${text}`);
  },
  onInterrupt: () => {
    log('User interrupted AI speech via VAD');
  },
  onAudioLevel: (level: number) => {
    // Audio level for visualization (already handled by window events)
  },
  onError: (error: Error) => {
    console.error('[cortex_0] Tivi error:', error);
    log(`Tivi error: ${error.message}`);
  },
  language: 'en-US',
  positiveSpeechThreshold: 0.8,
  negativeSpeechThreshold: 0.6,
  minSpeechMs: 500,
  verbose: false,
});
```

**Note**: Event listeners at lines 1395+ stay unchanged - tivi dispatches same events!

---

### Step 5: Replace speak_with_rate Calls

**File**: `/app/laboratory/cortex_0/app3.tsx`

#### Location 1: Line 287 (add_ai_message effect)
**Current**:
```typescript
let speak = async function(content : string) {
    await vi.speak_with_rate(content, playbackRate);
}
```

**Replace with**:
```typescript
let speak = async function(content : string) {
    await tivi.speak(content, playbackRate);
}
```

#### Location 2: Line 515 (add_ai_message function body)
**Current**:
```typescript
await vi.speak_with_rate(content, playbackRate);
```

**Replace with**:
```typescript
await tivi.speak(content, playbackRate);
```

---

### Step 6: Replace TTS Speaking Checks

**File**: `/app/laboratory/cortex_0/app3.tsx`

#### Location 1: Line 373 (stop word detection)
**Current**:
```typescript
if (! vi.tts.tts().speaking) {
```

**Replace with**:
```typescript
if (!tivi.isSpeaking) {
```

#### Location 2: Line 1280 (pause button handler)
**Current**:
```typescript
if (vi.tts.tts().speaking) {
```

**Replace with**:
```typescript
if (tivi.isSpeaking) {
```

---

### Step 7: Replace Cancel Speech + Pause Recognition

**File**: `/app/laboratory/cortex_0/app3.tsx`

#### Location 1: Lines 385-386 (stop word detection)
**Current**:
```typescript
vi.tts.cancel_speech();
vi.pause_recognition();
```

**Replace with**:
```typescript
tivi.cancelSpeech();
// No need to pause recognition - tivi handles this automatically
```

#### Location 2: Lines 1281-1282 (pause button handler)
**Current**:
```typescript
vi.tts.cancel_speech();
vi.pause_recognition();
```

**Replace with**:
```typescript
tivi.cancelSpeech();
// No need to pause recognition - tivi handles this automatically
```

**Why remove pause_recognition()**: Tivi automatically pauses recognition 2 seconds after speech ends. When TTS is cancelled, VAD will detect user speech and restart recognition automatically.

---

### Step 8: Replace Recognition Initialization

**File**: `/app/laboratory/cortex_0/app3.tsx`

**Current** (line 1393):
```typescript
await vi.initialize_recognition();
```

**Replace with**:
```typescript
await tivi.startListening();
```

**Note**: This single call replaces:
- `onnx.enable_vad()` (line 1377)
- `wa.initialize_microphone()` (line 1390)
- `vi.initialize_recognition()` (line 1393)

All are integrated into `tivi.startListening()`!

---

### Step 9: Remove Deprecated ONNX Import (Optional)

**File**: `/app/laboratory/cortex_0/app3.tsx`

**Line 38**: Check if `onnx` import is still used elsewhere
```typescript
import * as onnx from './src/onnx'
```

**If only used for VAD**: Can remove this import entirely since tivi includes VAD.

**File**: `/app/laboratory/cortex_0/src/onnx.ts`

This file is no longer needed - tivi has its own onnx.ts at `/app/laboratory/components/tivi/lib/onnx.ts`

---

## Files to Modify

1. **`/app/laboratory/components/tivi/lib/useTivi.ts`**
   - Add `cancelSpeech` method (Step 1)
   - Export it in return object

2. **`/app/laboratory/components/tivi/lib/types.ts`**
   - Add `cancelSpeech` to UseTiviReturn interface (Step 2)

3. **`/app/laboratory/cortex_0/app3.tsx`** (main file)
   - Remove vi import (Step 3)
   - Add tivi imports (Step 3)
   - Initialize tivi hook (Step 4)
   - Replace speak_with_rate calls × 2 (Step 5)
   - Replace speaking checks × 2 (Step 6)
   - Replace cancel + pause calls × 2 (Step 7)
   - Replace initialize_recognition (Step 8)
   - Optional: Remove onnx import if unused (Step 9)

---

## What Stays the Same

### Event Listeners (NO CHANGES NEEDED)
These event listeners at lines 276, 1395 will continue working:
```typescript
window.addEventListener('tidyscripts_web_speech_recognition_interim', ...);
window.addEventListener('tidyscripts_web_speech_recognition_result', ...);
window.addEventListener('tidyscripts_web_mic', ...);
```

**Why**: Tivi dispatches the exact same window events! Full compatibility.

### Bokeh Visualization (NO CHANGES)
Audio visualization at lines 1384-1390 continues to work with `tidyscripts_web_mic` events.

### Transcription Callback (NO CHANGES)
The `transcription_cb` function (lines 435-458) continues to work with the event listener.

---

## Edge Cases & Considerations

### 1. React Hook Rules
Tivi must be called at the **top level** of the Component function:
- ✅ After state declarations, before useEffect calls
- ❌ Not inside useEffect or callbacks

### 2. Mode Switching (Voice vs Chat)
Current code at line 512:
```typescript
if (mode != "chat") {
    await tivi.speak(content, playbackRate);
}
```
This continues to work - tivi.speak() is called conditionally based on mode.

### 3. Playback Rate Changes
The useEffect at line 285 re-creates the `speak` function when `playbackRate` changes. This continues to work because `tivi.speak()` accepts rate as second parameter.

### 4. Transcribe Toggle
The `transcribeRef.current` check at line 1400 continues to work - it gates the transcription callback, not the recognition itself.

### 5. Stop Word Detection
The interim result listener at line 366 checks for "stop" keyword. After replacing:
- Check `tivi.isSpeaking` instead of `vi.tts.tts().speaking`
- Call `tivi.cancelSpeech()` instead of `vi.tts.cancel_speech() + vi.pause_recognition()`
- Recognition auto-pauses after cancellation via VAD

---

## Testing Checklist

### Basic Functionality
- [ ] Voice mode: AI speaks responses at correct playback rate
- [ ] Chat mode: AI doesn't speak responses
- [ ] Transcription: User speech is transcribed correctly
- [ ] Interim results: Real-time transcription shows in UI

### TTS Interruption
- [ ] Say "stop" while AI is speaking → AI stops immediately
- [ ] Message added to chat: "I interrupted your speech..."
- [ ] Recognition resumes after interruption
- [ ] Pause button works to stop AI speech

### VAD Behavior
- [ ] Recognition doesn't start until user speaks
- [ ] Recognition pauses ~2s after user stops speaking
- [ ] No "no-speech" errors in console during silence
- [ ] Multiple speech segments work (speak, pause, speak again)

### Edge Cases
- [ ] Playback rate slider affects speech speed
- [ ] Transcribe toggle (waveform button) works
- [ ] Mode switching (voice ↔ chat) works correctly
- [ ] Audio visualization (Bokeh plot) updates during speech
- [ ] Stop word detection while AI says "stop" doesn't trigger interrupt

### Performance
- [ ] No console errors or warnings
- [ ] Recognition only runs when user speaking (check logs)
- [ ] Browser doesn't lag or stutter
- [ ] Memory doesn't leak over time

---

## Rollback Plan

If issues occur:
1. Revert changes to app3.tsx
2. Restore `const vi = tsw.util.voice_interface;`
3. Original VI code remains in tidyscripts_web (not removed)

---

## Summary of Changes

**Total files modified**: 3
**Lines changed in cortex_0**: ~15 lines in app3.tsx
**New code in tivi**: ~10 lines (cancelSpeech method)
**Breaking changes**: None (event system compatible)
**Estimated time**: 30 minutes

**Key Benefits**:
- VAD-triggered recognition (more efficient, no "no-speech" errors)
- Cleaner React hooks pattern
- Better TTS interruption handling
- No auto-restart issues
- Shared code with tivi component (easier maintenance)
