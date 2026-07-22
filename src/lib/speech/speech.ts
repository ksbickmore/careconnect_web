/**
 * Voice-readiness seam. The desktop app is voice-first (local Whisper engine
 * + speechSynthesis read-aloud); the web port defers voice features but keeps
 * this interface so wiring a real engine later is additive, not a refactor.
 *
 * Future implementations: Web Speech API (`speechSynthesis` for output,
 * `SpeechRecognition` for input) or the desktop Whisper/WASM engine (needs
 * COOP/COEP headers).
 */
export interface SpeechService {
  /** Speak the given text aloud, cancelling anything already speaking. */
  speak(text: string): void;
  /** Stop any in-progress speech. */
  cancel(): void;
  readonly isSupported: boolean;
}

/** No-op placeholder used until a real engine ships. */
export const speechService: SpeechService = {
  speak() {
    // Intentionally empty: voice output is not part of this milestone.
  },
  cancel() {
    // Intentionally empty.
  },
  isSupported: false,
};
