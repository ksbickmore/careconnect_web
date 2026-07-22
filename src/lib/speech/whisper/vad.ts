/**
 * Energy-based voice activity detection for the local Whisper engine. Pure
 * state machine over per-frame RMS levels so it can be unit-tested without
 * any audio APIs: feed it one RMS value per fixed-size frame and it reports
 * when speech starts and when an utterance has ended.
 */

export interface VadOptions {
  /** RMS level above which a frame counts as speech. */
  speechThreshold?: number;
  /** Silence duration (ms) after speech that ends the utterance. */
  silenceMs?: number;
  /** Hard cap on utterance length (ms) to stop runaway recordings. */
  maxUtteranceMs?: number;
}

export type VadEvent = 'none' | 'speech-start' | 'utterance-end';

const DEFAULTS: Required<VadOptions> = {
  speechThreshold: 0.01,
  silenceMs: 800,
  maxUtteranceMs: 30_000,
};

/** Root-mean-square level of one audio frame ([-1, 1] float samples). */
export function computeRms(frame: Float32Array): number {
  if (frame.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
  return Math.sqrt(sum / frame.length);
}

/**
 * Create a VAD processor. Call it once per frame with that frame's RMS; it
 * returns 'speech-start' on the first speech frame, 'utterance-end' once
 * enough trailing silence (or the max duration) has accumulated, and 'none'
 * otherwise. After 'utterance-end' the machine resets for the next utterance.
 */
export function createVad(
  frameMs: number,
  options: VadOptions = {},
): (rms: number) => VadEvent {
  const { speechThreshold, silenceMs, maxUtteranceMs } = {
    ...DEFAULTS,
    ...options,
  };

  let inSpeech = false;
  let silenceElapsed = 0;
  let utteranceElapsed = 0;

  return (rms) => {
    if (!inSpeech) {
      if (rms < speechThreshold) return 'none';
      inSpeech = true;
      silenceElapsed = 0;
      utteranceElapsed = frameMs;
      return 'speech-start';
    }

    utteranceElapsed += frameMs;
    silenceElapsed = rms < speechThreshold ? silenceElapsed + frameMs : 0;

    if (silenceElapsed >= silenceMs || utteranceElapsed >= maxUtteranceMs) {
      inSpeech = false;
      return 'utterance-end';
    }
    return 'none';
  };
}
