/**
 * Microphone capture for the local Whisper engine: getUserMedia → 16kHz
 * AudioContext → AudioWorklet posting raw PCM blocks → VAD segmentation.
 * Emits one Float32Array per utterance (including ~300ms of pre-roll so the
 * first word isn't clipped). Pure glue over browser audio APIs — the
 * segmentation logic itself lives in `vad.ts`, which is unit-tested.
 */

import workletUrl from './pcm-worklet.js?url';
import { computeRms, createVad } from './vad';
import type { MicCapture, MicCaptureHandlers } from './whisper-engine';

export const CAPTURE_SAMPLE_RATE = 16_000;

/** AudioWorklet render quantum is 128 frames → 8ms at 16kHz. */
const FRAME_MS = (128 / CAPTURE_SAMPLE_RATE) * 1000;

/** Keep ~300ms of audio from before speech was detected. */
const PREROLL_SAMPLES = 0.3 * CAPTURE_SAMPLE_RATE;

function concat(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function describeMicError(e: unknown): string {
  if (e instanceof DOMException) {
    if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
      return 'Microphone access was denied.';
    }
    if (e.name === 'NotFoundError' || e.name === 'OverconstrainedError') {
      return 'No microphone was found.';
    }
    if (e.name === 'NotReadableError') {
      return 'The microphone is in use by another application.';
    }
  }
  return e instanceof Error ? e.message : String(e);
}

/** Start capturing utterances from the default microphone. */
export async function startMicCapture(
  handlers: MicCaptureHandlers,
): Promise<MicCapture> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (e) {
    throw new Error(describeMicError(e));
  }

  const context = new AudioContext({ sampleRate: CAPTURE_SAMPLE_RATE });
  try {
    await context.audioWorklet.addModule(workletUrl);
  } catch (e) {
    stream.getTracks().forEach((track) => track.stop());
    void context.close();
    throw new Error(describeMicError(e));
  }

  const source = context.createMediaStreamSource(stream);
  const worklet = new AudioWorkletNode(context, 'pcm-capture');
  source.connect(worklet);

  const vad = createVad(FRAME_MS);
  /** Rolling pre-speech buffer, capped at PREROLL_SAMPLES. */
  let preroll: Float32Array[] = [];
  let prerollLength = 0;
  /** Chunks of the utterance currently being spoken (empty = not speaking). */
  let utterance: Float32Array[] = [];
  let stopped = false;

  worklet.port.onmessage = ({ data }: MessageEvent<Float32Array>) => {
    if (stopped) return;

    if (utterance.length > 0) {
      utterance.push(data);
    } else {
      preroll.push(data);
      prerollLength += data.length;
      while (prerollLength - (preroll[0]?.length ?? 0) >= PREROLL_SAMPLES) {
        prerollLength -= preroll.shift()!.length;
      }
    }

    const event = vad(computeRms(data));
    if (event === 'speech-start') {
      utterance = [...preroll];
      preroll = [];
      prerollLength = 0;
    } else if (event === 'utterance-end') {
      const pcm = concat(utterance);
      utterance = [];
      handlers.onUtterance(pcm);
    }
  };

  const track = stream.getAudioTracks()[0];
  if (track) {
    track.onended = () => {
      if (stopped) return;
      handlers.onError('The microphone was disconnected.');
    };
  }

  return {
    stop() {
      if (stopped) return;
      stopped = true;
      worklet.port.onmessage = null;
      source.disconnect();
      worklet.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      void context.close();
    },
  };
}
