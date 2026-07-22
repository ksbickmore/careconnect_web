/**
 * Session orchestration for the local Whisper speech engine: wires microphone
 * capture (utterance-segmented PCM) to the transcriber and adapts the result
 * to the app-wide `SpeechCallbacks` contract. Both collaborators are injected
 * so this logic is testable without audio APIs or the real model.
 */

import type { SpeechCallbacks, SpeechOptions } from '../speech-recognition';

/** A running microphone capture; `stop` releases the mic and audio graph. */
export interface MicCapture {
  stop(): void;
}

export interface MicCaptureHandlers {
  /** One utterance of 16kHz mono Float32 PCM, segmented by the VAD. */
  onUtterance(pcm: Float32Array): void;
  /** Unrecoverable capture error (device lost, worklet failure, …). */
  onError(message: string): void;
}

export type StartMicCapture = (
  handlers: MicCaptureHandlers,
) => Promise<MicCapture>;

export interface Transcriber {
  /** Transcribe one utterance, streaming partial text while decoding. */
  transcribe(
    pcm: Float32Array,
    onPartial: (text: string) => void,
  ): Promise<string>;
}

export interface WhisperEngineDeps {
  startMicCapture: StartMicCapture;
  transcriber: Transcriber;
}

export interface WhisperEngine {
  /** Start a session. Returns an unsubscribe that detaches the callbacks. */
  startListening(callbacks: SpeechCallbacks, options?: SpeechOptions): () => void;
  /** End the active session (mic released, `onEnd` fired once). */
  stopListening(): void;
}

interface Session {
  callbacks: SpeechCallbacks;
  continuous: boolean;
  capture: MicCapture | null;
  ended: boolean;
  /** Serializes decodes so overlapping utterances finish in order. */
  decodeChain: Promise<void>;
}

/**
 * Whisper renders non-speech audio as bracketed/parenthesized annotations
 * ("[BLANK_AUDIO]", "[ Pause ]", "(coughs)"). Strip them so noise-triggered
 * utterances don't surface as bogus transcripts.
 */
function stripNonSpeech(text: string): string {
  return text.replace(/\[[^\]]*\]|\([^)]*\)/g, '');
}

export function createWhisperEngine(deps: WhisperEngineDeps): WhisperEngine {
  let current: Session | null = null;

  function endSession(session: Session): void {
    if (session.ended) return;
    session.ended = true;
    session.capture?.stop();
    session.capture = null;
    if (current === session) current = null;
    session.callbacks.onEnd?.();
  }

  function startListening(
    callbacks: SpeechCallbacks,
    options: SpeechOptions = {},
  ): () => void {
    if (current) endSession(current);

    const session: Session = {
      callbacks,
      continuous: options.continuous ?? false,
      capture: null,
      ended: false,
      decodeChain: Promise.resolve(),
    };
    current = session;

    const handleUtterance = (pcm: Float32Array): void => {
      session.decodeChain = session.decodeChain.then(async () => {
        if (session.ended) return;
        try {
          const text = await deps.transcriber.transcribe(pcm, (partial) => {
            if (!session.ended) session.callbacks.onPartial?.(partial);
          });
          if (session.ended) return;
          const trimmed = stripNonSpeech(text).trim();
          if (trimmed) session.callbacks.onFinal?.(trimmed);
          if (!session.continuous) endSession(session);
        } catch (e) {
          session.callbacks.onError?.(e instanceof Error ? e.message : String(e));
          endSession(session);
        }
      });
    };

    void deps
      .startMicCapture({
        onUtterance: handleUtterance,
        onError: (message) => {
          session.callbacks.onError?.(message);
          endSession(session);
        },
      })
      .then((capture) => {
        // Session may have been stopped while getUserMedia was pending.
        if (session.ended) capture.stop();
        else session.capture = capture;
      })
      .catch((e: unknown) => {
        session.callbacks.onError?.(e instanceof Error ? e.message : String(e));
        endSession(session);
      });

    return () => {
      session.callbacks = {};
    };
  }

  return {
    startListening,
    stopListening() {
      if (current) endSession(current);
    },
  };
}
