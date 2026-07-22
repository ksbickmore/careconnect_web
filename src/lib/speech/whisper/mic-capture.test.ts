/**
 * Exercises mic-capture's glue over the browser audio APIs with fakes:
 * getUserMedia, AudioContext, and AudioWorkletNode are all stubbed, and PCM
 * frames are driven through the worklet port by hand. The VAD's own behavior
 * matrix lives in vad.test.ts.
 */

import { startMicCapture } from './mic-capture';
import type { MicCaptureHandlers } from './whisper-engine';

type PortListener = ((event: { data: Float32Array }) => void) | null;

const FRAME = 128;
const loudFrame = () => new Float32Array(FRAME).fill(0.2);
const quietFrame = () => new Float32Array(FRAME);

interface FakeEnv {
  tracks: { stop: jest.Mock; onended: (() => void) | null }[];
  addModule: jest.Mock;
  contexts: { closed: boolean }[];
  emitFrame(frame: Float32Array): void;
  sourceDisconnect: jest.Mock;
  workletDisconnect: jest.Mock;
}

function installAudioEnvironment({
  getUserMediaError,
  addModuleError,
}: { getUserMediaError?: Error; addModuleError?: Error } = {}): FakeEnv {
  const env: FakeEnv = {
    tracks: [],
    addModule: jest.fn(async () => {
      if (addModuleError) throw addModuleError;
    }),
    contexts: [],
    emitFrame: () => {
      throw new Error('worklet not created yet');
    },
    sourceDisconnect: jest.fn(),
    workletDisconnect: jest.fn(),
  };

  const makeTrack = () => {
    const track = { stop: jest.fn(), onended: null as (() => void) | null };
    env.tracks.push(track);
    return track;
  };

  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: jest.fn(async () => {
        if (getUserMediaError) throw getUserMediaError;
        const track = makeTrack();
        return {
          getTracks: () => [track],
          getAudioTracks: () => [track],
        };
      }),
    },
  });

  class FakeAudioContext {
    closed = false;
    audioWorklet = { addModule: env.addModule };
    constructor() {
      env.contexts.push(this);
    }
    createMediaStreamSource() {
      return { connect: jest.fn(), disconnect: env.sourceDisconnect };
    }
    close() {
      this.closed = true;
      return Promise.resolve();
    }
  }

  class FakeAudioWorkletNode {
    port: { onmessage: PortListener } = { onmessage: null };
    disconnect = env.workletDisconnect;
    constructor() {
      env.emitFrame = (frame) => this.port.onmessage?.({ data: frame });
    }
  }

  Object.defineProperty(globalThis, 'AudioContext', {
    configurable: true,
    value: FakeAudioContext,
  });
  Object.defineProperty(globalThis, 'AudioWorkletNode', {
    configurable: true,
    value: FakeAudioWorkletNode,
  });

  return env;
}

afterEach(() => {
  delete (navigator as { mediaDevices?: unknown }).mediaDevices;
  delete (globalThis as { AudioContext?: unknown }).AudioContext;
  delete (globalThis as { AudioWorkletNode?: unknown }).AudioWorkletNode;
});

const handlers = (): jest.Mocked<MicCaptureHandlers> => ({
  onUtterance: jest.fn(),
  onError: jest.fn(),
});

/** Frames of trailing silence that satisfy the default 800ms VAD window. */
const SILENCE_FRAMES = 101; // 800ms / 8ms per frame, plus one for rounding

describe('startMicCapture', () => {
  it('segments an utterance with pre-roll and emits it once', async () => {
    const env = installAudioEnvironment();
    const h = handlers();
    await startMicCapture(h);

    env.emitFrame(quietFrame()); // becomes pre-roll
    env.emitFrame(loudFrame()); // speech-start
    env.emitFrame(loudFrame());
    for (let i = 0; i < SILENCE_FRAMES; i++) env.emitFrame(quietFrame());

    expect(h.onUtterance).toHaveBeenCalledTimes(1);
    const pcm = h.onUtterance.mock.calls[0][0];
    // pre-roll quiet frame + 2 loud frames + trailing silence frames
    expect(pcm.length).toBeGreaterThanOrEqual(FRAME * 3);
    expect(h.onError).not.toHaveBeenCalled();
  });

  it('caps the pre-roll buffer instead of growing without bound', async () => {
    const env = installAudioEnvironment();
    const h = handlers();
    await startMicCapture(h);

    // ~2s of silence: pre-roll must stay capped near 300ms (4800 samples).
    for (let i = 0; i < 250; i++) env.emitFrame(quietFrame());
    env.emitFrame(loudFrame());
    for (let i = 0; i < SILENCE_FRAMES; i++) env.emitFrame(quietFrame());

    const pcm = h.onUtterance.mock.calls[0][0];
    // preroll cap (4800) + spoken frame + trailing silence ≤ ~18k samples
    expect(pcm.length).toBeLessThan(4800 + FRAME + SILENCE_FRAMES * FRAME + FRAME);
  });

  it('maps getUserMedia permission failures to a friendly error', async () => {
    installAudioEnvironment({
      getUserMediaError: new DOMException('denied', 'NotAllowedError'),
    });
    await expect(startMicCapture(handlers())).rejects.toThrow(
      'Microphone access was denied.',
    );
  });

  it('maps a missing microphone to a friendly error', async () => {
    installAudioEnvironment({
      getUserMediaError: new DOMException('none', 'NotFoundError'),
    });
    await expect(startMicCapture(handlers())).rejects.toThrow(
      'No microphone was found.',
    );
  });

  it('maps a busy microphone to a friendly error', async () => {
    installAudioEnvironment({
      getUserMediaError: new DOMException('busy', 'NotReadableError'),
    });
    await expect(startMicCapture(handlers())).rejects.toThrow(
      'The microphone is in use by another application.',
    );
  });

  it('releases the stream when the worklet module fails to load', async () => {
    const env = installAudioEnvironment({
      addModuleError: new Error('worklet load failed'),
    });
    await expect(startMicCapture(handlers())).rejects.toThrow(
      'worklet load failed',
    );
    expect(env.tracks[0].stop).toHaveBeenCalled();
    expect(env.contexts[0].closed).toBe(true);
  });

  it('reports a disconnected microphone through onError', async () => {
    const env = installAudioEnvironment();
    const h = handlers();
    await startMicCapture(h);

    env.tracks[0].onended?.();
    expect(h.onError).toHaveBeenCalledWith('The microphone was disconnected.');
  });

  it('stop() tears down the audio graph and ignores later frames', async () => {
    const env = installAudioEnvironment();
    const h = handlers();
    const capture = await startMicCapture(h);

    capture.stop();
    capture.stop(); // idempotent

    expect(env.tracks[0].stop).toHaveBeenCalledTimes(1);
    expect(env.sourceDisconnect).toHaveBeenCalled();
    expect(env.workletDisconnect).toHaveBeenCalled();
    expect(env.contexts[0].closed).toBe(true);
    // After stop, the track-ended handler must stay silent too.
    env.tracks[0].onended?.();
    expect(h.onError).not.toHaveBeenCalled();
  });
});
