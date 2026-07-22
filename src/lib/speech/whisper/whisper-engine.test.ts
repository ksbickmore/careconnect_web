import {
  createWhisperEngine,
  type MicCapture,
  type MicCaptureHandlers,
  type Transcriber,
} from './whisper-engine';

/** Flush pending microtasks so async engine steps settle. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Controllable fake mic: exposes the handlers the engine registered. */
function makeFakeMic() {
  const capture: MicCapture & { stopped: boolean } = {
    stopped: false,
    stop() {
      this.stopped = true;
    },
  };
  let handlers: MicCaptureHandlers | null = null;
  const startMicCapture = jest.fn(async (h: MicCaptureHandlers) => {
    handlers = h;
    return capture;
  });
  return {
    startMicCapture,
    capture,
    emitUtterance: (pcm: Float32Array) => handlers!.onUtterance(pcm),
    emitError: (message: string) => handlers!.onError(message),
  };
}

/** Transcriber whose results are queued up front; streams one partial each. */
function makeFakeTranscriber(...finals: string[]) {
  const calls: Float32Array[] = [];
  const transcriber: Transcriber = {
    async transcribe(pcm, onPartial) {
      calls.push(pcm);
      const text = finals.shift() ?? '';
      if (text) onPartial(text.slice(0, 3));
      return text;
    },
  };
  return { transcriber, calls };
}

const PCM = new Float32Array([0.1, 0.2, 0.3]);

describe('createWhisperEngine', () => {
  it('transcribes an utterance and ends the session (single-shot mode)', async () => {
    const mic = makeFakeMic();
    const { transcriber, calls } = makeFakeTranscriber('  open medications  ');
    const engine = createWhisperEngine({
      startMicCapture: mic.startMicCapture,
      transcriber,
    });

    const onPartial = jest.fn();
    const onFinal = jest.fn();
    const onEnd = jest.fn();
    engine.startListening({ onPartial, onFinal, onEnd });
    await flush();

    mic.emitUtterance(PCM);
    await flush();

    expect(calls).toEqual([PCM]);
    expect(onPartial).toHaveBeenCalledWith('  o');
    expect(onFinal).toHaveBeenCalledWith('open medications');
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(mic.capture.stopped).toBe(true);
  });

  it('keeps listening across utterances in continuous mode', async () => {
    const mic = makeFakeMic();
    const { transcriber } = makeFakeTranscriber('medications', 'schedule');
    const engine = createWhisperEngine({
      startMicCapture: mic.startMicCapture,
      transcriber,
    });

    const onFinal = jest.fn();
    const onEnd = jest.fn();
    engine.startListening({ onFinal, onEnd }, { continuous: true });
    await flush();

    mic.emitUtterance(PCM);
    await flush();
    expect(onFinal).toHaveBeenCalledWith('medications');
    expect(mic.capture.stopped).toBe(false);
    expect(onEnd).not.toHaveBeenCalled();

    mic.emitUtterance(PCM);
    await flush();
    expect(onFinal).toHaveBeenCalledWith('schedule');

    engine.stopListening();
    await flush();
    expect(mic.capture.stopped).toBe(true);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('skips non-speech annotation transcripts without firing onFinal', async () => {
    const mic = makeFakeMic();
    const { transcriber } = makeFakeTranscriber(' [BLANK_AUDIO] (coughs) ');
    const engine = createWhisperEngine({
      startMicCapture: mic.startMicCapture,
      transcriber,
    });

    const onFinal = jest.fn();
    const onEnd = jest.fn();
    engine.startListening({ onFinal, onEnd });
    await flush();
    mic.emitUtterance(PCM);
    await flush();

    expect(onFinal).not.toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('skips empty transcripts without firing onFinal', async () => {
    const mic = makeFakeMic();
    const { transcriber } = makeFakeTranscriber('   ');
    const engine = createWhisperEngine({
      startMicCapture: mic.startMicCapture,
      transcriber,
    });

    const onFinal = jest.fn();
    const onEnd = jest.fn();
    engine.startListening({ onFinal, onEnd });
    await flush();
    mic.emitUtterance(PCM);
    await flush();

    expect(onFinal).not.toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalledTimes(1); // single-shot still ends
  });

  it('surfaces mic startup failure as onError + onEnd', async () => {
    const startMicCapture = jest.fn(async () => {
      throw new Error('Microphone access was denied.');
    });
    const { transcriber } = makeFakeTranscriber();
    const engine = createWhisperEngine({ startMicCapture, transcriber });

    const onError = jest.fn();
    const onEnd = jest.fn();
    engine.startListening({ onError, onEnd });
    await flush();

    expect(onError).toHaveBeenCalledWith('Microphone access was denied.');
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('surfaces mic runtime errors and ends the session', async () => {
    const mic = makeFakeMic();
    const { transcriber } = makeFakeTranscriber();
    const engine = createWhisperEngine({
      startMicCapture: mic.startMicCapture,
      transcriber,
    });

    const onError = jest.fn();
    const onEnd = jest.fn();
    engine.startListening({ onError, onEnd });
    await flush();
    mic.emitError('Audio device disconnected.');
    await flush();

    expect(onError).toHaveBeenCalledWith('Audio device disconnected.');
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(mic.capture.stopped).toBe(true);
  });

  it('surfaces transcription failure as onError and ends single-shot sessions', async () => {
    const mic = makeFakeMic();
    const transcriber: Transcriber = {
      transcribe: async () => {
        throw new Error('Model files are missing.');
      },
    };
    const engine = createWhisperEngine({
      startMicCapture: mic.startMicCapture,
      transcriber,
    });

    const onError = jest.fn();
    const onEnd = jest.fn();
    engine.startListening({ onError, onEnd });
    await flush();
    mic.emitUtterance(PCM);
    await flush();

    expect(onError).toHaveBeenCalledWith('Model files are missing.');
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(mic.capture.stopped).toBe(true);
  });

  it('stopListening before any utterance ends the session without onFinal', async () => {
    const mic = makeFakeMic();
    const { transcriber } = makeFakeTranscriber('never');
    const engine = createWhisperEngine({
      startMicCapture: mic.startMicCapture,
      transcriber,
    });

    const onFinal = jest.fn();
    const onEnd = jest.fn();
    engine.startListening({ onFinal, onEnd });
    await flush();
    engine.stopListening();
    await flush();

    expect(onFinal).not.toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(mic.capture.stopped).toBe(true);
  });

  it('unsubscribe detaches callbacks without stopping the session', async () => {
    const mic = makeFakeMic();
    const { transcriber } = makeFakeTranscriber('ignored');
    const engine = createWhisperEngine({
      startMicCapture: mic.startMicCapture,
      transcriber,
    });

    const onFinal = jest.fn();
    const onEnd = jest.fn();
    const unsubscribe = engine.startListening({ onFinal, onEnd });
    await flush();
    unsubscribe();

    mic.emitUtterance(PCM);
    await flush();
    expect(onFinal).not.toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();
    expect(mic.capture.stopped).toBe(true); // single-shot still cleans up
  });

  it('onEnd fires exactly once when stop is called twice', async () => {
    const mic = makeFakeMic();
    const { transcriber } = makeFakeTranscriber();
    const engine = createWhisperEngine({
      startMicCapture: mic.startMicCapture,
      transcriber,
    });

    const onEnd = jest.fn();
    engine.startListening({ onEnd });
    await flush();
    engine.stopListening();
    engine.stopListening();
    await flush();

    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});
