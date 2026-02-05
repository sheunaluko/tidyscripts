'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { UseTiviReturn, TiviMode } from './types';

// -- Types --

export type CalibrationPhase =
  | 'idle'
  | 'phase1'
  | 'phase1-summary'
  | 'phase2'
  | 'phase2-summary';

export interface ProbSample {
  prob: number;
  timestamp: number;
}

export interface Spike {
  startTime: number;
  endTime: number;
  duration: number;
  peakProb: number;
}

export interface Phase1Results {
  data: ProbSample[];
  positiveSpeechThreshold: number;
  negativeSpeechThreshold: number;
  ambientCeiling: number;
  speechFloor: number;
  noSpeechDetected: boolean;
}

export interface Phase2Results {
  data: ProbSample[];
  threshold: number;
  spikes: Spike[];
  maxSpikeDuration: number;
  minSpeechStartMs: number;
  recommendDisableInterruption: boolean;
}

export interface UseCalibrationReturn {
  phase: CalibrationPhase;
  phase1Results: Phase1Results | null;
  phase2Results: Phase2Results | null;
  startCalibration: () => Promise<void>;
  finishPhase1: () => void;
  startPhase2: () => void;
  applyResults: () => void;
  cancelCalibration: () => void;
}

// -- Analysis Functions --

/**
 * Otsu's method: find the threshold that minimizes intra-class variance
 * between two groups in a distribution of values in [0, 1].
 * Returns the optimal split point.
 */
function otsuThreshold(values: number[], numBins: number = 100): number {
  // Build histogram
  const histogram = new Array(numBins).fill(0);
  for (const v of values) {
    const bin = Math.min(Math.floor(v * numBins), numBins - 1);
    histogram[bin]++;
  }

  const total = values.length;
  let sumAll = 0;
  for (let i = 0; i < numBins; i++) {
    sumAll += i * histogram[i];
  }

  let bestThreshold = 0;
  let bestVariance = -1;
  let weightBg = 0;
  let sumBg = 0;

  for (let t = 0; t < numBins; t++) {
    weightBg += histogram[t];
    if (weightBg === 0) continue;

    const weightFg = total - weightBg;
    if (weightFg === 0) break;

    sumBg += t * histogram[t];
    const meanBg = sumBg / weightBg;
    const meanFg = (sumAll - sumBg) / weightFg;

    // Between-class variance (maximize this = minimize intra-class)
    const varianceBetween = weightBg * weightFg * (meanBg - meanFg) ** 2;

    if (varianceBetween > bestVariance) {
      bestVariance = varianceBetween;
      bestThreshold = t;
    }
  }

  return (bestThreshold + 0.5) / numBins; // center of winning bin
}

function analyzePhase1(data: ProbSample[]): Phase1Results {
  const defaults: Phase1Results = {
    data,
    positiveSpeechThreshold: 0.7,
    negativeSpeechThreshold: 0.55,
    ambientCeiling: 0.1,
    speechFloor: 0.6,
    noSpeechDetected: true,
  };

  if (data.length === 0) return defaults;

  const probs = data.map((d) => d.prob);

  // Find optimal split via Otsu's method
  const splitPoint = otsuThreshold(probs);

  // Separate into clusters
  const ambientValues = probs.filter((p) => p <= splitPoint);
  const speechValues = probs.filter((p) => p > splitPoint);

  // Detect unimodal distribution (no real speech)
  // If the gap between clusters is too small, or one cluster is empty
  const ambientCeiling = ambientValues.length > 0 ? Math.max(...ambientValues) : 0;
  const speechFloor = speechValues.length > 0 ? Math.min(...speechValues) : 1;
  const gap = speechFloor - ambientCeiling;

  if (speechValues.length === 0 || gap < 0.1) {
    return { ...defaults, data, ambientCeiling };
  }

  // Robust speech floor: p10 of speech values (ignore lowest 10% as transitional)
  const sortedSpeech = [...speechValues].sort((a, b) => a - b);
  const p10Index = Math.max(0, Math.floor(sortedSpeech.length * 0.1));
  const robustSpeechFloor = sortedSpeech[p10Index];

  // Threshold: midpoint of the gap, biased toward ambient ceiling
  // (70% toward ambient, 30% toward speech — we want to catch speech reliably)
  const candidateThreshold = ambientCeiling + gap * 0.3;
  const positiveSpeechThreshold = Math.max(
    Math.min(candidateThreshold, 0.9),
    0.15
  );

  // Snap to 0.05 steps
  const rounded = Math.round(positiveSpeechThreshold * 20) / 20;
  const negativeSpeechThreshold = Math.max(rounded - 0.15, 0.05);

  return {
    data,
    positiveSpeechThreshold: rounded,
    negativeSpeechThreshold,
    ambientCeiling,
    speechFloor: robustSpeechFloor,
    noSpeechDetected: false,
  };
}

function analyzePhase2(
  data: ProbSample[],
  threshold: number
): Phase2Results {
  if (data.length === 0) {
    return {
      data,
      threshold,
      spikes: [],
      maxSpikeDuration: 0,
      minSpeechStartMs: 150,
      recommendDisableInterruption: false,
    };
  }

  // Find contiguous regions above threshold
  const spikes: Spike[] = [];
  let spikeStart: number | null = null;
  let peakProb = 0;

  for (let i = 0; i < data.length; i++) {
    const { prob, timestamp } = data[i];

    if (prob >= threshold) {
      if (spikeStart === null) {
        spikeStart = timestamp;
        peakProb = prob;
      } else {
        peakProb = Math.max(peakProb, prob);
      }
    } else {
      if (spikeStart !== null) {
        const duration = timestamp - spikeStart;
        if (duration > 10) {
          // Ignore spikes shorter than 10ms (noise)
          spikes.push({
            startTime: spikeStart,
            endTime: timestamp,
            duration,
            peakProb,
          });
        }
        spikeStart = null;
        peakProb = 0;
      }
    }
  }

  // Close any open spike at end
  if (spikeStart !== null && data.length > 0) {
    const lastTimestamp = data[data.length - 1].timestamp;
    const duration = lastTimestamp - spikeStart;
    if (duration > 10) {
      spikes.push({
        startTime: spikeStart,
        endTime: lastTimestamp,
        duration,
        peakProb,
      });
    }
  }

  const maxSpikeDuration =
    spikes.length > 0 ? Math.max(...spikes.map((s) => s.duration)) : 0;

  // minSpeechStartMs = max spike duration + margin
  // margin: max(50ms, 30% of max duration)
  let minSpeechStartMs = 150; // default
  const recommendDisableInterruption = maxSpikeDuration > 500;

  if (maxSpikeDuration > 0) {
    const margin = Math.max(50, maxSpikeDuration * 0.3);
    minSpeechStartMs = Math.ceil((maxSpikeDuration + margin) / 32) * 32; // snap to 32ms (frame size)
  }

  return {
    data,
    threshold,
    spikes,
    maxSpikeDuration,
    minSpeechStartMs,
    recommendDisableInterruption,
  };
}

// -- Hook --

const CALIBRATION_TTS_TEXT =
  'The quick brown fox jumps over the lazy dog. This sentence is being used to test echo cancellation and voice activity detection calibration.';

type VadParamKey = 'positiveSpeechThreshold' | 'negativeSpeechThreshold' | 'minSpeechStartMs' | 'verbose' | 'mode' | 'powerThreshold' | 'enableInterruption';

export function useCalibration(
  tivi: UseTiviReturn,
  vadParams: {
    mode: TiviMode;
    enableInterruption: boolean;
    [key: string]: any;
  },
  updateVadParam: (key: VadParamKey, value: any) => void
): UseCalibrationReturn {
  const [phase, setPhase] = useState<CalibrationPhase>('idle');
  const [phase1Results, setPhase1Results] = useState<Phase1Results | null>(null);
  const [phase2Results, setPhase2Results] = useState<Phase2Results | null>(null);

  const dataRef = useRef<ProbSample[]>([]);
  const rafRef = useRef<number | null>(null);
  const wasVADPausedRef = useRef(false);
  const wasListeningRef = useRef(false);
  const prevEnableInterruptionRef = useRef(true);

  // Cleanup on unmount: stop sampling, restore VAD state
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (wasVADPausedRef.current) {
        tivi.pauseVADProcessing();
      }
    };
  }, [tivi]);

  // Start/stop sampling speechProbRef via rAF
  const startSampling = useCallback(() => {
    dataRef.current = [];

    const sample = () => {
      dataRef.current.push({
        prob: tivi.speechProbRef.current,
        timestamp: performance.now(),
      });
      rafRef.current = requestAnimationFrame(sample);
    };

    rafRef.current = requestAnimationFrame(sample);
  }, [tivi.speechProbRef]);

  const stopSampling = useCallback((): ProbSample[] => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    return [...dataRef.current];
  }, []);

  const startCalibration = useCallback(async () => {
    // Save previous state
    wasListeningRef.current = tivi.isListening;
    prevEnableInterruptionRef.current = vadParams.enableInterruption;

    // Ensure we're listening
    if (!tivi.isListening) {
      await tivi.startListening();
    }

    // Ensure VAD is processing (in responsive/continuous, it's paused)
    if (vadParams.mode !== 'guarded') {
      wasVADPausedRef.current = true;
      tivi.resumeVADProcessing();
    } else {
      wasVADPausedRef.current = false;
    }

    // Reset results
    setPhase1Results(null);
    setPhase2Results(null);

    // Start phase 1
    startSampling();
    setPhase('phase1');
  }, [tivi, vadParams.mode, vadParams.enableInterruption, startSampling]);

  const finishPhase1 = useCallback(() => {
    const data = stopSampling();
    const results = analyzePhase1(data);
    setPhase1Results(results);
    setPhase('phase1-summary');
  }, [stopSampling]);

  const startPhase2 = useCallback(() => {
    if (!phase1Results) return;

    // Temporarily disable interruption for TTS test
    updateVadParam('enableInterruption', false);

    // Start sampling for phase 2
    startSampling();
    setPhase('phase2');

    // Play TTS — when it finishes, analyze
    tivi.speak(CALIBRATION_TTS_TEXT, 1.0).then(() => {
      const data = stopSampling();
      const results = analyzePhase2(data, phase1Results.positiveSpeechThreshold);
      setPhase2Results(results);

      // Restore interruption setting
      updateVadParam('enableInterruption', prevEnableInterruptionRef.current);

      setPhase('phase2-summary');
    });
  }, [phase1Results, tivi, startSampling, stopSampling, updateVadParam]);

  const applyResults = useCallback(() => {
    if (phase1Results) {
      updateVadParam('positiveSpeechThreshold', phase1Results.positiveSpeechThreshold);
      updateVadParam('negativeSpeechThreshold', phase1Results.negativeSpeechThreshold);
    }
    if (phase2Results) {
      updateVadParam('minSpeechStartMs', phase2Results.minSpeechStartMs);
      if (phase2Results.recommendDisableInterruption) {
        updateVadParam('enableInterruption', false);
      }
    }

    // Restore VAD processing state
    if (wasVADPausedRef.current) {
      tivi.pauseVADProcessing();
    }

    setPhase('idle');
  }, [phase1Results, phase2Results, updateVadParam, tivi]);

  const cancelCalibration = useCallback(() => {
    // Stop any active sampling
    stopSampling();

    // Cancel any playing TTS
    tivi.cancelSpeech();

    // Restore interruption setting
    updateVadParam('enableInterruption', prevEnableInterruptionRef.current);

    // Restore VAD processing state
    if (wasVADPausedRef.current) {
      tivi.pauseVADProcessing();
    }

    setPhase1Results(null);
    setPhase2Results(null);
    setPhase('idle');
  }, [stopSampling, tivi, updateVadParam]);

  return {
    phase,
    phase1Results,
    phase2Results,
    startCalibration,
    finishPhase1,
    startPhase2,
    applyResults,
    cancelCalibration,
  };
}
