import { useEffect, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSpeechRecognition } from '@/lib/speech/use-speech-recognition';
import { parseNavigationKeyword } from '@/lib/voice/navigation-keywords';
import {
  dispatchVoiceCommand,
  hintGroups,
  useVoiceRegistryStore,
} from '@/lib/voice/voice-registry';
import { useVoiceCommands } from '@/lib/voice/use-voice-commands';
import {
  clearFieldByName,
  clearFocusedField,
  clickButtonByName,
  dictateIntoFocusedField,
  openDialog,
} from '@/lib/voice/dom-actions';
import { useAnnouncerStore } from '@/stores/announcer-store';
import styles from './VoiceInputBar.module.css';

/**
 * Persistent voice command bar, mounted in AppShell so it is available on
 * every authenticated page. Owns the app's single continuous speech session
 * and dispatches each utterance through the voice command registry: dialog
 * commands, then page commands, then global commands, then navigation
 * keywords, then a visible-button-name fallback. `Ctrl+Space` toggles it
 * from anywhere (AppShell clicks this button by id). Ported from the
 * desktop app's identical component (minus its global search overlay).
 */
export function VoiceInputBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const announce = useAnnouncerStore((state) => state.announce);
  const [hint, setHint] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  // Subscribed (not read imperatively) so the open panel updates when a
  // dialog registers or unregisters its commands.
  const scopes = useVoiceRegistryStore((state) => state.scopes);

  const say = (message: string) => {
    setHint(message);
    announce(message);
  };

  const handleFinal = (final: string) => {
    // 1. Registered commands: dialog > page > global.
    const result = dispatchVoiceCommand(final);
    if (result.handled) {
      if (result.feedback) say(result.feedback);
      else setHint(`Heard: "${final}"`);
      return;
    }

    if (openDialog()) {
      // 2a. Dictation into the focused text field of the open dialog.
      const label = dictateIntoFocusedField(final);
      if (label) {
        say(`Added to ${label}.`);
        return;
      }
      // 2b. Buttons inside the dialog by name.
      const pressed = clickButtonByName(final);
      if (pressed) {
        say(`${pressed}.`);
        return;
      }
    } else {
      // 2c. Dictation into a focused text field in the main content (e.g.
      // the messages composer) — before navigation keywords, so free-form
      // speech is not hijacked by a keyword it happens to contain.
      const label = dictateIntoFocusedField(final);
      if (label) {
        say(`Added to ${label}.`);
        return;
      }
      // 3. Navigation keywords (lenient substring matching).
      const command = parseNavigationKeyword(final);
      const sameRoute = command != null && command.route === location.pathname;
      if (command && !sameRoute) {
        say(`Opening ${command.label}.`);
        void navigate(command.route);
        return;
      }
      // 4. Visible buttons in the main content by name.
      const pressed = clickButtonByName(final);
      if (pressed) {
        say(`${pressed}.`);
        return;
      }
      if (sameRoute && command) {
        say(`Already on ${command.label}.`);
        return;
      }
    }

    setHint(`Heard: "${final}" — say "what can I say" for options.`);
    announce(
      'Command not recognized. Say "what can I say" for options.',
      'assertive',
    );
  };

  const { listening, transcript, error, modelProgress, available, start, stop } =
    useSpeechRecognition(handleFinal, { continuous: true });

  // Errors otherwise appear only as quiet status text; make sure screen
  // reader users hear them too.
  useEffect(() => {
    if (error) announce(error, 'assertive');
  }, [error, announce]);

  useVoiceCommands('global', [
    {
      phrases: ['stop listening', 'stop voice'],
      hint: 'stop listening',
      run: () => {
        stop();
        return 'Voice commands off.';
      },
    },
    {
      phrases: ['what can i say', 'help', 'show help'],
      hint: 'what can I say',
      run: () => {
        setHelpOpen(true);
        return 'Showing what you can say. Say "close help" when done.';
      },
    },
    {
      phrases: ['close help', 'hide help'],
      hint: 'close help',
      run: () => {
        setHelpOpen(false);
        return 'Help closed.';
      },
    },
    {
      // Fix dictation mistakes: empty a field by its label, anywhere.
      phrases: ['clear *'],
      hint: 'clear <field name>',
      run: (value = '') => {
        const label = clearFieldByName(value);
        return label
          ? `Cleared ${label}.`
          : `Could not find a "${value}" field to clear.`;
      },
    },
    {
      phrases: ['clear', 'clear field'],
      hint: 'clear',
      run: () => {
        const label = clearFocusedField();
        return label
          ? `Cleared ${label}.`
          : 'Focus a text field first, or say "clear" plus the field name.';
      },
    },
  ]);

  // E2E seam: Playwright cannot grant a real microphone or afford the model
  // download in CI, so tests inject final transcripts through this event and
  // exercise the full dispatch pipeline (registry → dialogs → navigation).
  useEffect(() => {
    const onTranscript = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (typeof detail === 'string') handleFinal(detail);
    };
    document.addEventListener('careconnect:voice-transcript', onTranscript);
    return () =>
      document.removeEventListener('careconnect:voice-transcript', onTranscript);
  });

  const toggle = () => {
    if (!available) {
      setHint('Voice input is not available in this environment.');
      return;
    }
    if (listening) stop();
    else {
      setHint(null); // don't show a previous session's feedback as current
      void start();
    }
  };

  // First voice use on a device downloads the model (~40–85 MB), which can
  // take minutes on a slow connection — without this the bar just says
  // "Listening…" and looks broken.
  const loadingStatus =
    modelProgress == null
      ? null
      : modelProgress < 100
        ? `Downloading voice model… ${modelProgress}%`
        : 'Preparing voice recognition…';

  // While listening: the in-flight utterance, else the last command's
  // feedback — previously feedback was unreachable during a continuous
  // session, so commands appeared to do nothing.
  const status = listening
    ? transcript ||
      hint ||
      loadingStatus ||
      'Listening… speak a command, or say "what can I say".'
    : (error ?? hint ?? 'Tap to speak a command, or press Ctrl+Space.');
  const isErrorStatus = !listening && error != null;

  const KIND_LABELS = {
    dialog: 'In this dialog',
    screen: 'On this page',
    global: 'Anywhere',
  } as const;

  return (
    <>
      {helpOpen && (
        <section className={styles.help} aria-label="Voice commands">
          <div className={styles.helpHead}>
            <h2>What you can say</h2>
            <button
              type="button"
              className={styles.helpClose}
              onClick={() => setHelpOpen(false)}
              aria-label="Close voice help"
            >
              ×
            </button>
          </div>
          {hintGroups(scopes).map((group) => (
            <div key={group.kind} className={styles.helpGroup}>
              <h3>{KIND_LABELS[group.kind]}</h3>
              <ul>
                {group.hints.map((hintText) => (
                  <li key={hintText}>{hintText}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    <div className={styles.bar}>
      <button
        id="voice-command-mic"
        type="button"
        className={`${styles.mic} ${listening ? styles.listening : ''}`}
        onClick={toggle}
        aria-pressed={listening}
        aria-label={listening ? 'Stop voice command' : 'Start voice command'}
      >
        {available ? (
          <Mic size={20} aria-hidden="true" />
        ) : (
          <MicOff size={20} aria-hidden="true" />
        )}
      </button>
      <span
        className={`${styles.label} ${isErrorStatus ? styles.error : ''}`}
      >
        {status}
      </span>
      <kbd className={styles.kbd}>Ctrl Space</kbd>
    </div>
    </>
  );
}
