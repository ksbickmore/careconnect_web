/**
 * Main-thread side of the Whisper Web Worker: implements the engine's
 * `Transcriber` interface by posting PCM to `whisper-worker.ts` and routing
 * its partial/final/error messages back to per-request callbacks.
 *
 * The worker is created lazily on the first transcription and then kept for
 * the app's lifetime so the model loads only once. The device-appropriate
 * model id is sent as an init message immediately after creation, so it is
 * always in place before the first transcribe request.
 */

import WhisperWorker from './whisper-worker?worker';
import { pickWhisperModel } from './model-select';
import type { Transcriber } from './whisper-engine';
import type { TranscribeResponse } from './whisper-worker';

interface PendingRequest {
  onPartial: (text: string) => void;
  onProgress?: (percent: number) => void;
  resolve: (text: string) => void;
  reject: (error: Error) => void;
}

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, PendingRequest>();

function failAll(message: string): void {
  for (const request of pending.values()) request.reject(new Error(message));
  pending.clear();
}

function getWorker(): Worker {
  if (worker) return worker;
  worker = new WhisperWorker();
  worker.postMessage({ type: 'init', model: pickWhisperModel() });
  worker.onmessage = ({ data }: MessageEvent<TranscribeResponse>) => {
    if (data.type === 'progress') {
      // Model-load progress belongs to no single request — fan it out.
      for (const request of pending.values()) request.onProgress?.(data.percent);
      return;
    }
    const request = pending.get(data.id);
    if (!request) return;
    if (data.type === 'partial') {
      request.onPartial(data.text);
    } else if (data.type === 'final') {
      pending.delete(data.id);
      request.resolve(data.text);
    } else {
      pending.delete(data.id);
      request.reject(new Error(data.message));
    }
  };
  worker.onerror = (event) => {
    // Worker-level failure (script/model runtime crash): fail everything and
    // drop the worker so the next attempt starts fresh.
    failAll(event.message || 'Speech transcription failed.');
    worker?.terminate();
    worker = null;
  };
  return worker;
}

/** Transcriber backed by the shared Whisper worker. */
export function createWorkerTranscriber(): Transcriber {
  return {
    transcribe(pcm, onPartial, onProgress) {
      return new Promise<string>((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { onPartial, onProgress, resolve, reject });
        // Transfer the buffer — utterances can be ~1MB and are not reused.
        getWorker().postMessage({ type: 'transcribe', id, pcm }, [pcm.buffer]);
      });
    },
  };
}
