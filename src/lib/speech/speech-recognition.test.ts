/**
 * Contract tests for the speech wrapper. The Whisper collaborators are
 * module-mocked; the engine's full behavior matrix lives in
 * `whisper/whisper-engine.test.ts`.
 */
jest.mock('./whisper/mic-capture');
jest.mock('./whisper/worker-transcriber');

import {
  isSpeechAvailable,
  startListening,
  stopListening,
} from './speech-recognition';
import { startMicCapture } from './whisper/mic-capture';
import { createWorkerTranscriber } from './whisper/worker-transcriber';
import type {
  MicCapture,
  MicCaptureHandlers,
  Transcriber,
} from './whisper/whisper-engine';

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Make jsdom look like an environment with mic + worker + wasm support. */
function installSpeechEnvironment(): void {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: jest.fn() },
  });
  Object.defineProperty(globalThis, 'Worker', {
    configurable: true,
    value: class {},
  });
}

function removeSpeechEnvironment(): void {
  delete (navigator as { mediaDevices?: unknown }).mediaDevices;
  delete (globalThis as { Worker?: unknown }).Worker;
}

let micHandlers: MicCaptureHandlers | null = null;
const capture: MicCapture & { stopped: boolean } = {
  stopped: false,
  stop() {
    this.stopped = true;
  },
};
const transcribe = jest.fn<
  ReturnType<Transcriber['transcribe']>,
  Parameters<Transcriber['transcribe']>
>();

beforeEach(() => {
  micHandlers = null;
  capture.stopped = false;
  (startMicCapture as jest.Mock).mockImplementation(
    async (handlers: MicCaptureHandlers) => {
      micHandlers = handlers;
      return capture;
    },
  );
  (createWorkerTranscriber as jest.Mock).mockReturnValue({ transcribe });
  transcribe.mockResolvedValue('');
});

afterEach(() => {
  stopListening();
  removeSpeechEnvironment();
});

describe('without microphone/worker support (plain jsdom)', () => {
  it('reports speech as unavailable', () => {
    expect(isSpeechAvailable()).toBe(false);
  });

  it('startListening degrades to onError + onEnd without throwing', () => {
    const onError = jest.fn();
    const onEnd = jest.fn();
    const unsubscribe = startListening({ onError, onEnd });
    expect(onError).toHaveBeenCalledWith('Speech recognition is not available.');
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(() => unsubscribe()).not.toThrow();
  });

  it('stopListening is a no-op', () => {
    expect(() => stopListening()).not.toThrow();
  });
});

describe('with microphone/worker support', () => {
  beforeEach(() => {
    installSpeechEnvironment();
  });

  it('reports speech as available', () => {
    expect(isSpeechAvailable()).toBe(true);
  });

  it('transcribes an utterance: partials, trimmed final, then end', async () => {
    transcribe.mockImplementation(async (_pcm, onPartial) => {
      onPartial('open medi');
      return '  open medications  ';
    });
    const onPartial = jest.fn();
    const onFinal = jest.fn();
    const onEnd = jest.fn();

    startListening({ onPartial, onFinal, onEnd });
    await flush();
    micHandlers!.onUtterance(new Float32Array([0.1]));
    await flush();

    expect(onPartial).toHaveBeenCalledWith('open medi');
    expect(onFinal).toHaveBeenCalledWith('open medications');
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(capture.stopped).toBe(true);
  });

  it('keeps the mic open across utterances when continuous', async () => {
    transcribe.mockResolvedValue('medications');
    const onFinal = jest.fn();
    const onEnd = jest.fn();

    startListening({ onFinal, onEnd }, { continuous: true });
    await flush();
    micHandlers!.onUtterance(new Float32Array([0.1]));
    await flush();

    expect(onFinal).toHaveBeenCalledWith('medications');
    expect(capture.stopped).toBe(false);
    expect(onEnd).not.toHaveBeenCalled();

    stopListening();
    expect(capture.stopped).toBe(true);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('surfaces microphone errors through onError', async () => {
    const onError = jest.fn();
    const onEnd = jest.fn();
    startListening({ onError, onEnd });
    await flush();
    micHandlers!.onError('Microphone access was denied.');

    expect(onError).toHaveBeenCalledWith('Microphone access was denied.');
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe detaches the callbacks', async () => {
    transcribe.mockResolvedValue('ignored');
    const onFinal = jest.fn();
    const unsubscribe = startListening({ onFinal });
    await flush();
    unsubscribe();
    micHandlers!.onUtterance(new Float32Array([0.1]));
    await flush();

    expect(onFinal).not.toHaveBeenCalled();
  });
});
