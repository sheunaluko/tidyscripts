# Cortex_0 App Versions

This directory contains multiple versions of the Cortex voice agent interface. Each version represents an iteration or experiment in voice interaction architecture.

## Version History

### app.tsx (v1) - Original
**Status**: Legacy
**Voice System**: Basic tidyscripts_web integration

The original Cortex voice agent implementation with basic voice interface.

---

### app2.tsx (v2) - Enhanced Voice
**Status**: Legacy
**Voice System**: tidyscripts_web with improved event handling

Enhanced version with better voice recognition event handling and UI improvements.

---

### app3.tsx (v3) - Current Stable
**Status**: ✅ **Stable & Working**
**Voice System**: tidyscripts_web with manual event listeners

**Key Features:**
- Manual event listeners for `tidyscripts_web_speech_recognition_result` and `_interim`
- Direct `vi.speak_with_rate()` for TTS (no interruption)
- Bokeh audio visualization
- Full cortex agent integration (functions, widgets, chat/voice modes)
- Proven stable recognition system

**Architecture:**
```
Recognition: tidyscripts_web → Browser events → Component listeners
TTS: vi.speak_with_rate() (pauses recognition, no interruption)
Visualization: Bokeh plots with microphone callback
```

**Use this if:** You want the most stable, proven voice interface without interruption features.

---

### app4_vi2.tsx (v4) - useInterruptibleVoice Experiment
**Status**: ⚠️ **Deprecated - Had Issues**
**Voice System**: useInterruptibleVoice hook (Silero VAD + WebSpeech)

**Attempted Features:**
- Custom hook managing both recognition AND interruption
- VAD-based interruption during TTS
- Echo cancellation via MediaStream constraints

**Why Deprecated:**
- Microphone conflicts (VAD + Bokeh visualization)
- React hook managed recognition (conflicted with tidyscripts_web)
- Not working reliably in cortex_0
- Over-engineered for the use case

**Lessons Learned:**
- Don't replace working recognition (tidyscripts_web)
- VAD should only be used during TTS, not for normal recognition
- Separation of concerns: recognition ≠ interruption

---

### app5_hybrid.tsx (v5) - Current Best
**Status**: ✅ **RECOMMENDED - Current Version**
**Voice System**: Hybrid (tidyscripts_web + useTTSWithInterruption)

**Key Features:**
- **Recognition**: Unchanged from app3 (tidyscripts_web with manual event listeners)
- **TTS with Interruption**: New `useTTSWithInterruption` hook
- **VAD-based interruption**: Only active during TTS playback
- **Echo cancellation**: Enabled in VAD audio stream
- **Lazy VAD init**: VAD only created when first TTS call happens
- **Clean separation**: Hook ONLY manages TTS, component manages recognition

**Architecture:**
```
Recognition (unchanged from app3):
  tidyscripts_web → Browser events → Component listeners

TTS with Interruption (new):
  tts.speak() → Pause recognition → Start TTS → Enable VAD
  → If user speaks: Cancel TTS + Resume recognition
  → If TTS finishes: Resume recognition
```

**Integration Changes from app3:**
1. Import: `import { useTTSWithInterruption } from '../components/voice_interface/lib'`
2. Initialize hook:
   ```typescript
   const tts = useTTSWithInterruption({
     onInterrupt: () => log('Interrupted'),
     positiveSpeechThreshold: 0.9,  // Conservative to avoid false positives
     negativeSpeechThreshold: 0.75,
     minSpeechMs: 600,  // Requires 600ms of speech to trigger
     verbose: false,
   });
   ```
3. Replace TTS calls: `vi.speak_with_rate(text, rate)` → `tts.speak(text, rate)`

**VAD Configuration:**
- **Positive threshold: 0.9** (higher = less sensitive, avoids TTS self-trigger)
- **Negative threshold: 0.75** (maintains ~0.15 gap)
- **Min speech: 600ms** (longer duration to avoid false positives)
- **Delay: 800ms** after TTS starts before VAD enables (critical for stability)

**Why It Works:**
- Keeps proven tidyscripts_web recognition
- No microphone conflicts (VAD only during TTS)
- Echo cancellation prevents TTS feedback
- Delay prevents catching initial TTS audio
- Conservative thresholds avoid false triggers

**Use this if:** You want stable recognition WITH the ability to interrupt AI responses.

---

## Component Hierarchy

### useTTSWithInterruption Hook
**Location**: `/app/laboratory/components/voice_interface/lib/useTTSWithInterruption.ts`

**Purpose**: Provides TTS with VAD-based interruption (minimal, focused hook)

**Does:**
- ✅ Wraps TTS with interruption detection
- ✅ Manages VAD lifecycle (lazy init, cleanup)
- ✅ Pauses/resumes tidyscripts recognition
- ✅ Provides `speak(text, rate)` and `isSpeaking` state

**Does NOT:**
- ❌ Manage recognition (component handles this)
- ❌ Add event listeners
- ❌ Touch component state (except isSpeaking)

**Architecture Decisions:**
1. **Lazy VAD Init**: Uses vanilla `vad.MicVAD.new()` API, not React hook
2. **Echo Cancellation**: Custom MediaStream with `echoCancellation: true`
3. **Delay Before VAD**: 800ms delay after TTS starts prevents self-trigger
4. **Ref-based Storage**: VAD instance persists across re-renders
5. **Cleanup**: Only destroys VAD on component unmount

---

## File Structure

```
cortex_0/
├── app.tsx              # v1 - Original
├── app2.tsx             # v2 - Enhanced
├── app3.tsx             # v3 - Stable (no interruption)
├── app4_vi2.tsx         # v4 - Deprecated (full hook)
├── app5_hybrid.tsx      # v5 - CURRENT (hybrid approach)
├── page.tsx             # Entry point (currently uses app5_hybrid)
├── cortex_agent_web.ts  # Cortex agent logic
├── VERSIONS.md          # This file
└── ...

../components/voice_interface/lib/
├── useTTSWithInterruption.ts  # TTS interruption hook (v5 only)
├── useInterruptibleVoice.ts   # Full voice hook (deprecated, used in v4)
├── types.ts                   # TypeScript interfaces
└── index.ts                   # Exports
```

---

## Migration Guide

### From app3 → app5_hybrid

**Changes Required:** 3 lines

1. **Add import:**
   ```typescript
   import { useTTSWithInterruption } from '../components/voice_interface/lib';
   ```

2. **Initialize hook:**
   ```typescript
   const tts = useTTSWithInterruption({
     onInterrupt: () => log('TTS interrupted'),
     positiveSpeechThreshold: 0.9,
     negativeSpeechThreshold: 0.75,
     minSpeechMs: 600,
     verbose: false,
   });
   ```

3. **Replace TTS calls:**
   ```typescript
   // Before:
   await vi.speak_with_rate(text, playbackRate);

   // After:
   await tts.speak(text, playbackRate);
   ```

**Everything else stays the same!**

---

## Testing Notes

### Common Issues & Solutions

**Issue**: TTS immediately stops after starting
**Cause**: VAD catching initial TTS audio
**Solution**: Increased delay to 800ms before VAD starts

**Issue**: TTS keeps canceling itself
**Cause**: VAD too sensitive, catching TTS audio
**Solution**:
- Higher thresholds (0.9/0.75)
- Longer min speech duration (600ms)
- Echo cancellation enabled

**Issue**: VAD destroyed on page load
**Cause**: React Strict Mode double-render
**Solution**: Lazy VAD initialization (only created on first TTS call)

---

## Recommended Version

**Use app5_hybrid.tsx** - It provides:
- ✅ Stable recognition (proven in app3)
- ✅ TTS interruption capability
- ✅ No breaking changes to recognition
- ✅ Minimal code changes
- ✅ Clean architecture

---

## Future Improvements

Potential enhancements for future versions:

1. **Dynamic VAD tuning**: Auto-adjust thresholds based on environment
2. **Interrupt cooldown**: Prevent rapid re-interruptions
3. **Visual feedback**: Show VAD state in UI
4. **Configurable delay**: Make 800ms delay adjustable
5. **Interrupt with command**: Specific phrases trigger different behaviors
6. **Multi-language support**: Different VAD configs per language
