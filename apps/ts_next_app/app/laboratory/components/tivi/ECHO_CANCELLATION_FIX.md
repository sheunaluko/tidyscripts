# Echo Cancellation Fix - Tivi Component

## Date
2026-01-09

## Problem
TTS audio was being picked up by the audio visualization, despite VAD having echo cancellation enabled. The visualization should remain silent during TTS playback, but was showing audio activity when the system was speaking.

## Root Cause
Multiple AudioContext instances were being created with conflicting echo cancellation settings:

### Architecture Before Fix
```
1. VAD AudioContext (echo cancellation: true)
   └─ source → analyser → worklet

2. tidyscripts_web AudioContext (via vi.initialize_recognition())
   └─ audio_detector() → browser_mic.connect()
   └─ Creates ScriptProcessorNode (deprecated)
   └─ getUserMedia({audio: true}) - NO echo cancellation constraint
   └─ Used for audio power monitoring
```

**Result:** Power monitoring used a separate AudioContext WITHOUT echo cancellation, causing TTS audio to appear in the visualization.

## Investigation Process

1. **Initial hypothesis**: VAD's AudioContext not connecting to `destination` might prevent full echo cancellation activation
   - Added GainNode(0) → destination connection
   - This was not the actual fix

2. **Discovery**: Found `vi.initialize_recognition()` in `onSpeechStart` callback (useTivi.ts:162-163)
   - This triggered `audio_detector()` in tidyscripts_web
   - Which called `browser_mic.connect()`
   - Which created a ScriptProcessorNode with new AudioContext
   - This third AudioContext had no echo cancellation constraints

3. **Code trace**:
   ```
   useTivi.ts:162 → vi.initialize_recognition()
   ↓
   voice_interface.ts:103 → ap.audio_detector()
   ↓
   audio_processing.ts:29 → start_power()
   ↓
   audio_processing.ts:14 → mic.connect()
   ↓
   browser_mic.ts:38 → createScriptProcessor (deprecated)
   browser_mic.ts:33 → getUserMedia({audio: true}) - NO echo cancellation
   ```

## Solution

**Removed redundant audio detection from tidyscripts_web's voice_interface.**

The VAD already handles speech detection, making the deprecated ScriptProcessorNode-based audio_detector unnecessary.

### Changes Made

**File: `app/laboratory/components/tivi/lib/useTivi.ts`**

Commented out all `vi.initialize_recognition()` and `vi.start_recognition()` calls:

```typescript
// onSpeechStart callback - lines 148-171
onSpeechStart: async () => {
  // REMOVED: vi.initialize_recognition()
  // REMOVED: vi.start_recognition()
  // REMOVED: TTS interruption check
}

// onSpeechEnd callback - lines 173-187
onSpeechEnd: (audio: Float32Array) => {
  // REMOVED: vi.pause_recognition()
}

// Cleanup - line 52
// REMOVED: vi.stop_recognition()

// stopListening - line 244
// REMOVED: vi.pause_recognition()
```

**Kept only TTS functionality:**
- Line 254: `vi.speak_with_rate(text, rate)` - TTS does not create AudioContexts

### Architecture After Fix
```
1. VAD AudioContext (echo cancellation: true)
   └─ source → analyser → worklet → gain(0) → destination
   └─ analyser also used for power monitoring

2. No other AudioContexts created
```

**Result:** Single AudioContext with echo cancellation for both VAD and power monitoring. TTS audio no longer appears in visualization.

## Verification

✅ TTS audio does NOT show up in the audio visualization
✅ No deprecation warnings for ScriptProcessorNode
✅ Only one AudioContext created with proper echo cancellation

## Side Effects / Trade-offs

**Removed functionality:**
- WebSpeech API-based transcription (since `vi.initialize_recognition()` was removed)
- Event listeners for `tidyscripts_web_speech_recognition_result` still present but inactive (lines 58-83)

**To restore transcription:**
Would need to either:
1. Use WebSpeech API directly without tidyscripts_web's audio_detector wrapper
2. Modify tidyscripts_web to allow recognition without audio_detector
3. Implement a custom transcription solution using the VAD audio stream

## Technical Notes

### Why tidyscripts_web Creates Extra AudioContext
The `voice_interface.initialize_recognition()` function automatically sets up `audio_detector()` for triggering speech recognition. This was designed for standalone use where VAD isn't present. When combined with VAD, it creates redundant audio processing.

### Browser Echo Cancellation Behavior
- Echo cancellation is specified per getUserMedia() call
- Each MediaStream has its own constraints
- Multiple AudioContexts using different streams = inconsistent echo cancellation
- The browser applies echo cancellation at the MediaStreamTrack level, not AudioContext level

### Deprecated ScriptProcessorNode
- `browser_mic.ts` line 38 uses the deprecated `createScriptProcessor()` API
- This should be migrated to AudioWorkletNode (like VAD already uses)
- However, since we removed this code path entirely, migration is not needed for tivi

## Files Modified

1. `app/laboratory/components/tivi/lib/useTivi.ts`
   - Commented out voice_interface recognition calls
   - Kept only TTS functionality

## Related Files (Not Modified)

- `packages/ts_web/src/util/voice_interface.ts` - tidyscripts_web voice interface
- `packages/ts_web/src/util/audio_processing.ts` - Audio detector with ScriptProcessorNode
- `packages/ts_web/src/util/browser_mic.ts` - Deprecated ScriptProcessorNode implementation
- `app/laboratory/components/tivi/lib/ts_vad/src/ts-vad.ts` - VAD implementation with echo cancellation

## Lessons Learned

1. **Always audit all AudioContext creations** when debugging echo cancellation issues
2. **Library wrappers can create hidden audio contexts** - check transitive calls
3. **Echo cancellation must be consistent across all audio streams** used for the same purpose
4. **Browser console warnings** (ScriptProcessorNode deprecation) can be clues to deeper issues
5. **Multiple audio contexts = multiple getUserMedia calls = inconsistent constraints**
