import { useCallback, useEffect, useRef, useState } from 'react';

import {
  isSpeechAvailable,
  startListening,
  stopListening,
  type SpeechOptions,
} from './speech-recognition';

export interface UseSpeechRecognition {
  /** True while a recognition session is active. */
  listening: boolean;
  /** Live partial transcript of the in-flight utterance ('' between them). */
  transcript: string;
  /** Human-readable error from the last session, if any. */
  error: string | null;
  /**
   * Model-load progress (0–100) while the speech model is downloading, or
   * null when no download is in flight. Non-null only on a device's first
   * voice use; afterwards the model is served from cache.
   */
  modelProgress: number | null;
  /** False when the environment lacks speech support. */
  available: boolean;
  start(): Promise<void>;
  stop(): void;
}

/**
 * React hook over the speech wrapper used by `VoiceInputBar` and the
 * dictation fields. `onFinal` fires once per completed utterance with the
 * final transcript. Ported from the desktop app's identical hook.
 */
export function useSpeechRecognition(
  onFinal?: (transcript: string) => void,
  options: SpeechOptions = {},
): UseSpeechRecognition {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [modelProgress, setModelProgress] = useState<number | null>(null);

  // Keep the latest callback without re-subscribing mid-session. Assigned in
  // an effect (not during render) so aborted renders can't leak into the ref;
  // the ref is only read from engine callbacks, which fire after commit.
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  });
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const continuous = options.continuous ?? false;

  useEffect(
    () => () => {
      // Drop listeners and stop any session still running on unmount.
      unsubscribeRef.current?.();
      stopListening();
    },
    [],
  );

  const start = useCallback(async () => {
    if (unsubscribeRef.current) return; // already listening
    setError(null);
    setTranscript('');

    // The mic itself prompts on session start; there is no separate
    // permission call to make first.
    if (!isSpeechAvailable()) {
      setError('Speech recognition is not available.');
      return;
    }

    setListening(true);
    unsubscribeRef.current = startListening(
      {
        onPartial: (text) => {
          setModelProgress(null);
          setTranscript(text);
        },
        onFinal: (text) => {
          setModelProgress(null);
          // Clear rather than keep the final text: between utterances the
          // voice bar shows the command's feedback, which the lingering
          // transcript would otherwise mask for the whole session.
          setTranscript('');
          onFinalRef.current?.(text);
        },
        onError: (message) => setError(message),
        onProgress: (percent) => setModelProgress(percent),
        onEnd: () => {
          unsubscribeRef.current?.();
          unsubscribeRef.current = null;
          setListening(false);
          setModelProgress(null);
        },
      },
      { continuous },
    );
  }, [continuous]);

  const stop = useCallback(() => {
    stopListening();
  }, []);

  return {
    listening,
    transcript,
    error,
    modelProgress,
    available: isSpeechAvailable(),
    start,
    stop,
  };
}
