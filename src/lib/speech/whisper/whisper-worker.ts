/**
 * Web Worker hosting the transformers.js Whisper pipeline. Runs off the UI
 * thread; the model stays in memory after the first load. All model and ONNX
 * runtime files are served same-origin from `/models/` (populated by
 * `scripts/fetch-models.mjs`) — remote loading is disabled so the app never
 * phones home.
 *
 * Protocol (messages from `worker-transcriber.ts`):
 *   in:  { type: 'init', model }                          pick tiny/base model
 *        { type: 'transcribe', id, pcm: Float32Array }    16kHz mono PCM
 *   out: { type: 'partial', id, text }                    while decoding
 *        { type: 'final',   id, text }
 *        { type: 'error',   id, message }
 */

import {
  env,
  pipeline,
  WhisperTextStreamer,
  type AutomaticSpeechRecognitionPipeline,
} from '@huggingface/transformers';

import type { WhisperModelId } from './model-select';
import { createProgressAggregator } from './model-progress';

env.allowLocalModels = true; // off by default in browser builds
env.allowRemoteModels = false;
env.localModelPath = '/models/';
// Workbox's `whisper-models` runtime cache is the single offline cache for
// model files; transformers.js' own Cache API layer would just double-store
// the ~85 MB of weights.
env.useBrowserCache = false;
if (env.backends.onnx?.wasm) {
  env.backends.onnx.wasm.wasmPaths = '/models/ort/';
}

/** Set by the init message before the first transcribe (see transcriber). */
let model: WhisperModelId = 'whisper-base.en';

export interface InitRequest {
  type: 'init';
  model: WhisperModelId;
}

export interface TranscribeRequest {
  type: 'transcribe';
  id: number;
  pcm: Float32Array;
}

export type WorkerRequest = InitRequest | TranscribeRequest;

export type TranscribeResponse =
  | { type: 'partial'; id: number; text: string }
  | { type: 'final'; id: number; text: string }
  | { type: 'error'; id: number; message: string }
  /** Model-load progress; not tied to one request, so it carries no id. */
  | { type: 'progress'; percent: number };

let pipelinePromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

function getPipeline(): Promise<AutomaticSpeechRecognitionPipeline> {
  // Report aggregate download progress so the UI can show that the first
  // voice use is fetching the model rather than silently "listening".
  const aggregate = createProgressAggregator();
  let lastPercent = -1;
  pipelinePromise ??= pipeline('automatic-speech-recognition', model, {
    dtype: 'q8',
    progress_callback: (event) => {
      const percent = aggregate(event as Parameters<typeof aggregate>[0]);
      if (percent !== null && percent !== lastPercent) {
        lastPercent = percent;
        post({ type: 'progress', percent });
      }
    },
  }).catch((e: unknown) => {
    // Allow a retry on the next utterance instead of caching the failure.
    pipelinePromise = null;
    throw new Error(
      `Speech model failed to load: ${e instanceof Error ? e.message : String(e)}`,
    );
  });
  return pipelinePromise;
}

const post = (message: TranscribeResponse) => self.postMessage(message);

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  if (data.type === 'init') {
    model = data.model;
    return;
  }
  if (data.type !== 'transcribe') return;
  const { id, pcm } = data;
  try {
    const transcriber = await getPipeline();

    // Stream decoded words back as they are produced. The ASR pipeline types
    // its tokenizer as the base class, but it is a WhisperTokenizer at runtime.
    const tokenizer =
      transcriber.tokenizer as ConstructorParameters<typeof WhisperTextStreamer>[0];
    let partial = '';
    const streamer = new WhisperTextStreamer(tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (text: string) => {
        partial += text;
        post({ type: 'partial', id, text: partial });
      },
    });

    const output = await transcriber(pcm, { streamer });
    const result = Array.isArray(output) ? output[0] : output;
    post({ type: 'final', id, text: result.text ?? '' });
  } catch (e) {
    post({
      type: 'error',
      id,
      message: e instanceof Error ? e.message : String(e),
    });
  }
};
