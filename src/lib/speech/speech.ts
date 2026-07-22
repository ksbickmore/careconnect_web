/**
 * Text-to-speech service backed by the native `speechSynthesis` API (the
 * same engine the desktop app uses for read-aloud). Speech *input* is the
 * separate local Whisper engine (`speech-recognition.ts`); this seam covers
 * voice output only, so the "read aloud" command and announcement read-back
 * can evolve without touching any page.
 */
export interface SpeechService {
  /** Speak the given text aloud, cancelling anything already speaking. */
  speak(text: string): void;
  /** Stop any in-progress speech. */
  cancel(): void;
  readonly isSupported: boolean;
}

function synth(): SpeechSynthesis | undefined {
  return typeof window !== 'undefined' ? window.speechSynthesis : undefined;
}

export const speechService: SpeechService = {
  speak(text) {
    const s = synth();
    if (!s || !text.trim()) return;
    s.cancel();
    s.speak(new SpeechSynthesisUtterance(text));
  },
  cancel() {
    synth()?.cancel();
  },
  get isSupported() {
    return synth() !== undefined;
  },
};
