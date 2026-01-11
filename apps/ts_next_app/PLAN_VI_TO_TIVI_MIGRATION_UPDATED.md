# Replace Voice Interface (VI) with Tivi in Cortex_0 - Updated Plan

## Overview

Replace all `tidyscripts_web.util.voice_interface` (vi) functionality in cortex_0 with the new tivi component. This will modernize the voice interface to use:
- VAD-triggered speech recognition (more efficient)
- Clean React hooks pattern
- Better TTS interruption handling (via VAD, not keywords)
- No auto-restart issues

## Key Changes from Original Plan

1. **REMOVED**: Stop keyword detection (lines 364-395) - Replaced with VAD-based interruption
2. **SIMPLIFIED**: Pause button - No longer sends chat messages, just cancels speech
3. **SIMPLIFIED**: No manual `pause_recognition()` calls - Tivi handles via VAD automatically

## Current State

Cortex_0 currently uses VI from tidyscripts_web for:
1. **TTS**: `vi.speak_with_rate(text, rate)` - Speaking AI responses
2. **TTS State**: `vi.tts.tts().speaking` - Checking if AI is speaking
3. **TTS Cancel**: `vi.tts.cancel_speech()` - Stopping speech on pause button click
4. **Recognition Pause**: `vi.pause_recognition()` - Pausing recognition after cancel (DEPRECATED)
5. **Recognition Init**: `vi.initialize_recognition()` - Starting recognition system
6. **Stop Keyword Detection**: useEffect checking for "stop" in interim results (TO BE REMOVED)

## Target State

Replace with tivi hook which provides:
- `tivi.speak(text, rate)` - TTS with rate control
- `tivi.isSpeaking` - Boolean state for speaking status
- `tivi.cancelSpeech()` - Cancel current speech
- `tivi.startListening()` - Initialize VAD + recognition (replaces init + pause logic)
- **VAD-based interruption**: User just starts speaking to interrupt AI (no keywords needed!)
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

**Location**: After line 353 (after clearTranscription), before return statement at line 358

**Why**: Pause button needs to cancel speech manually via UI

---

### Step 2: Update TypeScript Types

**File**: `/app/laboratory/components/tivi/lib/types.ts`

**Add to UseTiviReturn interface** (after line 116):
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

**Note**: Event listeners at lines 276, 1395+ stay unchanged - tivi dispatches same events!

---

### Step 5: Replace speak_with_rate Calls

**File**: `/app/laboratory/cortex_0/app3.tsx`

#### Location 1: Line 287 (useEffect for playback rate)
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

### Step 6: REMOVE Stop Keyword Detection

**File**: `/app/laboratory/cortex_0/app3.tsx`

**Location**: Lines 364-395

**DELETE ENTIRE useEffect**:
```typescript
useEffect( ()=> {
    //log(`Interim result: ${interim_result}`)
    //compare the interim result to last ai message to determine if we should stop...


    if (interim_result.includes("stop") ) {
        log(`Detected stop word in the interim results`);

        //if the AI is NOT talking then we should NOT stop (since its just the user talking)
        if (! vi.tts.tts().speaking) {
            log(`However the AI is not talking so will ignore`)
            return
        }


        if (last_ai_message.includes("stop")){
            log(`However the AI also said stop so... ignoring`)
        } else {
            log(`AND the AI did not say stop so assuming it is the user`) ;


            vi.tts.cancel_speech() ;
            vi.pause_recognition();
            add_user_message(`I no longer wanted to listen to your output and so I interrupted your speech with the keyword "stop" at the following location in your output: ${interim_result}. Do not respond until I prompt you again`) ;


        }

    }


}, [interim_result])
```

**Why**: Tivi provides VAD-based interruption automatically. User just starts speaking to interrupt AI - no keyword needed!

---

### Step 7: Simplify Pause Button Handler

**File**: `/app/laboratory/cortex_0/app3.tsx`

**Location**: Lines 1278-1289

**Current**:
```typescript
<IconButton onClick={
function() {
    if (vi.tts.tts().speaking) {
        vi.tts.cancel_speech() ;
        vi.pause_recognition();
        add_user_message(`I no longer wanted to listen to your output and so I interrupted your speech with the keyword "stop". Do not respond until I prompt you again`) ;
    }

}
}>
<PauseCircleOutlineIcon />
</IconButton>
```

**Replace with**:
```typescript
<IconButton onClick={() => {
    if (tivi.isSpeaking) {
        tivi.cancelSpeech();
    }
}}>
<PauseCircleOutlineIcon />
</IconButton>
```

**Why**:
- No message sending (user decision)
- No manual pause_recognition (tivi handles via VAD)
- Simple, clean speech cancellation

---

### Step 8: Replace Recognition Initialization

**File**: `/app/laboratory/cortex_0/app3.tsx`

**Current** (lines 1377-1393):
```typescript
//enable vad FIRST
await onnx.enable_vad() ;

//start streaming microphone data to the mic graph
log(`Initializing microphone`) ;
await wa.initialize_microphone() ;

//register graph callback
wa.register_mic_callback('update_viz'  , function(f32 : Float32Array) {
    if (! GLOBAL_PAUSE ) {
        let val = dsp.mean_abs(f32 as any) ;
        let new_data = x_y_gaussian(viz_n, val+viz_s, val+viz_s) ;
        window.data_sources['viz'].stream(new_data, viz_n) ;
    }
})

//register mic callback
await vi.initialize_recognition() ;
```

**Replace with**:
```typescript
//start tivi listening (handles VAD + mic + recognition)
log(`Starting tivi listening...`);
await tivi.startListening();

//register graph callback for visualization
// Note: Tivi dispatches 'tidyscripts_web_mic' events, so Bokeh viz at line 1384+ still works!
wa.register_mic_callback('update_viz', function(f32 : Float32Array) {
    if (! GLOBAL_PAUSE ) {
        let val = dsp.mean_abs(f32 as any) ;
        let new_data = x_y_gaussian(viz_n, val+viz_s, val+viz_s) ;
        window.data_sources['viz'].stream(new_data, viz_n) ;
    }
})
```

**Note**: This single `tivi.startListening()` call replaces:
- `onnx.enable_vad()` (line 1377)
- `wa.initialize_microphone()` (line 1381)
- `vi.initialize_recognition()` (line 1393)

All are integrated into tivi!

**IMPORTANT**: Keep the `wa.register_mic_callback` for Bokeh visualization compatibility

---

### Step 9: Remove Deprecated ONNX Import (Optional)

**File**: `/app/laboratory/cortex_0/app3.tsx`

**Line 44**: Check if `onnx` import is still used elsewhere
```typescript
import * as onnx from "./src/onnx"
```

**Action**: If only used for VAD (line 1377), remove this import entirely since tivi includes VAD.

**File**: `/app/laboratory/cortex_0/src/onnx.ts`

**Action**: This file is no longer needed - tivi has its own onnx.ts at `/app/laboratory/components/tivi/lib/onnx.ts`

**VERIFY**: Grep for other uses of `onnx.` in app3.tsx before removing

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
   - **DELETE** stop keyword detection useEffect (Step 6)
   - **SIMPLIFY** pause button handler (Step 7)
   - Replace initialization sequence (Step 8)
   - Optional: Remove onnx import if unused (Step 9)

---

## What Stays the Same

### Event Listeners (NO CHANGES NEEDED)
These event listeners at lines 276, 1395+ will continue working:
```typescript
window.addEventListener('tidyscripts_web_speech_recognition_interim', ...);
window.addEventListener('tidyscripts_web_speech_recognition_result', ...);
window.addEventListener('tidyscripts_web_mic', ...);
```

**Why**: Tivi dispatches the exact same window events! Full compatibility.

### Bokeh Visualization (MINIMAL CHANGES)
Audio visualization callback at lines 1384-1390 continues to work with `tidyscripts_web_mic` events. Only the initialization changes (Step 8).

### Transcription Callback (NO CHANGES)
The transcription event listener at line 1395+ continues to work unchanged.

---

## New Interruption Behavior

### Old Behavior (VI):
1. User says "stop" keyword
2. Check if AI is speaking via `vi.tts.tts().speaking`
3. Check if AI message contains "stop" (avoid false positive)
4. Cancel speech + pause recognition
5. Send message to chat about interruption

### New Behavior (Tivi):
1. **User just starts speaking** (any words!)
2. VAD detects speech start
3. Tivi automatically checks `tts.isSpeaking()`
4. If speaking, calls `tts.cancelSpeech()` + triggers `onInterrupt` callback
5. Speech recognition starts immediately
6. **No chat message** (cleaner, more natural)

**Benefits**:
- More natural (speak normally to interrupt)
- No false positives (VAD is smarter than keyword matching)
- Faster (no need to say specific word)
- Cleaner conversation (no interruption messages)

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

### 5. Pause Button Behavior
After migration:
- Simple click → cancels speech immediately
- No chat messages sent
- No manual recognition pausing (VAD handles it)
- User can click or just start speaking to interrupt

---

## Testing Checklist

### Basic Functionality
- [ ] Voice mode: AI speaks responses at correct playback rate
- [ ] Chat mode: AI doesn't speak responses
- [ ] Transcription: User speech is transcribed correctly
- [ ] Interim results: Real-time transcription shows in UI

### TTS Interruption (NEW BEHAVIOR)
- [ ] User starts speaking while AI talking → AI stops immediately
- [ ] No chat message added about interruption
- [ ] Recognition resumes after interruption
- [ ] Pause button stops AI speech (no message)
- [ ] Multiple interruptions work correctly

### VAD Behavior
- [ ] Recognition doesn't start until user speaks
- [ ] Recognition pauses ~2s after user stops speaking
- [ ] No "no-speech" errors in console during silence
- [ ] Multiple speech segments work (speak, pause, speak again)
- [ ] Interruption works naturally (any speech, not just "stop")

### Edge Cases
- [ ] Playback rate slider affects speech speed
- [ ] Transcribe toggle (waveform button) works
- [ ] Mode switching (voice ↔ chat) works correctly
- [ ] Audio visualization (Bokeh plot) updates during speech
- [ ] No false interruptions when user says "stop" in chat mode

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
3. Restore stop keyword detection useEffect
4. Restore original pause button handler
5. Original VI code remains in tidyscripts_web (not removed)

---

## Summary of Changes

**Total files modified**: 3

**Lines changed in cortex_0**: ~30 lines in app3.tsx
- Removed: ~35 lines (stop keyword detection)
- Modified: ~15 lines (VI → tivi replacements)
- Simplified: ~10 lines (pause button)

**New code in tivi**: ~10 lines (cancelSpeech method)

**Breaking changes**: None (event system compatible)

**Key Benefits**:
- ✅ VAD-triggered recognition (more efficient, no "no-speech" errors)
- ✅ Natural interruption (speak normally, no keywords)
- ✅ Cleaner React hooks pattern
- ✅ Simpler pause button (no chat pollution)
- ✅ No auto-restart issues
- ✅ Shared code with tivi component (easier maintenance)
- ✅ Less code overall (removed stop keyword logic)

---

## Migration Execution Order

1. **Phase 1: Prepare Tivi** (Steps 1-2)
   - Add cancelSpeech to useTivi.ts
   - Add cancelSpeech to types.ts
   - Test tivi component standalone

2. **Phase 2: Update Cortex Imports** (Steps 3-4)
   - Replace VI import with tivi imports
   - Initialize tivi hook
   - Verify no runtime errors

3. **Phase 3: Replace VI Calls** (Steps 5-7)
   - Replace speak_with_rate → tivi.speak
   - Remove stop keyword detection
   - Simplify pause button
   - Test voice mode + interruption

4. **Phase 4: Replace Initialization** (Step 8)
   - Replace VAD/mic/recognition init with tivi.startListening()
   - Test full voice flow
   - Verify Bokeh visualization still works

5. **Phase 5: Cleanup** (Step 9)
   - Remove unused onnx import
   - Clean up console logs
   - Final testing

---

## Notes

- The migration is **non-breaking** - event system remains compatible
- Stop keyword detection is **removed** - VAD interruption is more natural
- Pause button is **simplified** - no chat messages
- Estimated implementation time: 45 minutes
- Estimated testing time: 30 minutes
- Total time: ~1-1.5 hours
