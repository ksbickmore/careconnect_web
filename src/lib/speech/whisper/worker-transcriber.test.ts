/**
 * Tests the main-thread worker bridge with a fake Worker class injected in
 * place of the Vite `?worker` import. The module keeps a singleton worker, so
 * each test reloads it via jest.isolateModules for a clean slate.
 */

interface WorkerLike {
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: { message?: string }) => void) | null;
  postMessage: jest.Mock;
  terminate: jest.Mock;
}

const instances: WorkerLike[] = [];

jest.mock('./whisper-worker?worker', () => ({
  __esModule: true,
  default: class FakeWorker implements WorkerLike {
    onmessage: WorkerLike['onmessage'] = null;
    onerror: WorkerLike['onerror'] = null;
    postMessage = jest.fn();
    terminate = jest.fn();
    constructor() {
      instances.push(this);
    }
  },
}));

jest.mock('./model-select', () => ({
  pickWhisperModel: jest.fn(() => 'whisper-tiny.en'),
}));

import type { Transcriber } from './whisper-engine';

function loadTranscriber(): Transcriber {
  let transcriber: Transcriber | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./worker-transcriber') as {
      createWorkerTranscriber(): Transcriber;
    };
    transcriber = mod.createWorkerTranscriber();
  });
  return transcriber!;
}

const PCM = () => new Float32Array([0.1, 0.2]);

beforeEach(() => {
  instances.length = 0;
});

describe('createWorkerTranscriber', () => {
  it('creates the worker lazily and sends the picked model as init', () => {
    const transcriber = loadTranscriber();
    expect(instances).toHaveLength(0); // no worker until first transcribe

    void transcriber.transcribe(PCM(), jest.fn());
    expect(instances).toHaveLength(1);
    expect(instances[0].postMessage).toHaveBeenNthCalledWith(1, {
      type: 'init',
      model: 'whisper-tiny.en',
    });
  });

  it('posts PCM with a transferred buffer and resolves on final', async () => {
    const transcriber = loadTranscriber();
    const pcm = PCM();
    const onPartial = jest.fn();
    const result = transcriber.transcribe(pcm, onPartial);

    const worker = instances[0];
    const [message, transfer] = worker.postMessage.mock.calls[1] as [
      { type: string; id: number; pcm: Float32Array },
      Transferable[],
    ];
    expect(message).toEqual({ type: 'transcribe', id: expect.any(Number), pcm });
    expect(transfer).toEqual([pcm.buffer]);

    worker.onmessage!({ data: { type: 'partial', id: message.id, text: 'open' } });
    worker.onmessage!({
      data: { type: 'final', id: message.id, text: 'open medications' },
    });

    expect(onPartial).toHaveBeenCalledWith('open');
    await expect(result).resolves.toBe('open medications');
  });

  it('rejects the matching request on an error response', async () => {
    const transcriber = loadTranscriber();
    const result = transcriber.transcribe(PCM(), jest.fn());
    const worker = instances[0];
    const { id } = worker.postMessage.mock.calls[1][0] as { id: number };

    worker.onmessage!({ data: { type: 'error', id, message: 'Model failed.' } });
    await expect(result).rejects.toThrow('Model failed.');
  });

  it('broadcasts model-load progress to every pending request', () => {
    const transcriber = loadTranscriber();
    const firstProgress = jest.fn();
    const secondProgress = jest.fn();
    void transcriber.transcribe(PCM(), jest.fn(), firstProgress);
    void transcriber.transcribe(PCM(), jest.fn(), secondProgress);

    instances[0].onmessage!({ data: { type: 'progress', percent: 42 } });

    expect(firstProgress).toHaveBeenCalledWith(42);
    expect(secondProgress).toHaveBeenCalledWith(42);
  });

  it('ignores responses for unknown request ids', () => {
    const transcriber = loadTranscriber();
    void transcriber.transcribe(PCM(), jest.fn());
    const worker = instances[0];
    expect(() =>
      worker.onmessage!({ data: { type: 'final', id: 999, text: 'stray' } }),
    ).not.toThrow();
  });

  it('reuses one worker across transcriptions', () => {
    const transcriber = loadTranscriber();
    void transcriber.transcribe(PCM(), jest.fn());
    void transcriber.transcribe(PCM(), jest.fn());
    expect(instances).toHaveLength(1);
  });

  it('fails all pending requests and drops the worker on a crash', async () => {
    const transcriber = loadTranscriber();
    const first = transcriber.transcribe(PCM(), jest.fn());
    const second = transcriber.transcribe(PCM(), jest.fn());
    const worker = instances[0];

    worker.onerror!({ message: 'wasm crashed' });
    await expect(first).rejects.toThrow('wasm crashed');
    await expect(second).rejects.toThrow('wasm crashed');
    expect(worker.terminate).toHaveBeenCalled();

    // Next transcribe builds a fresh worker (with a fresh init message).
    void transcriber.transcribe(PCM(), jest.fn());
    expect(instances).toHaveLength(2);
    expect(instances[1].postMessage).toHaveBeenNthCalledWith(1, {
      type: 'init',
      model: 'whisper-tiny.en',
    });
  });

  it('falls back to a generic message when the crash has none', async () => {
    const transcriber = loadTranscriber();
    const result = transcriber.transcribe(PCM(), jest.fn());
    instances[0].onerror!({});
    await expect(result).rejects.toThrow('Speech transcription failed.');
  });
});
