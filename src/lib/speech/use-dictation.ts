import type { Dispatch, SetStateAction } from 'react';

import { useSpeechRecognition } from './use-speech-recognition';

export interface UseDictation {
  /** True while a dictation session is active. */
  listening: boolean;
  /** False when the environment lacks speech support. */
  available: boolean;
  /** Start dictation, or stop the active session. No-op when unavailable. */
  toggle(): void;
}

/**
 * Dictation into a text field: appends each final utterance to the caller's
 * string state (space-separated) and exposes a single mic toggle. Available
 * for form dialogs and the messages composer.
 */
export function useDictation(setText: Dispatch<SetStateAction<string>>): UseDictation {
  const { listening, available, start, stop } = useSpeechRecognition((final) =>
    setText((prev) => (prev ? `${prev} ${final}` : final)),
  );

  const toggle = () => {
    if (!available) return;
    if (listening) stop();
    else void start();
  };

  return { listening, available, toggle };
}
