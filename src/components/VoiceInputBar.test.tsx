import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { VoiceInputBar } from './VoiceInputBar';
import { useVoiceRegistryStore } from '@/lib/voice/voice-registry';
import { useAnnouncerStore } from '@/stores/announcer-store';
import { useSpeechRecognition } from '@/lib/speech/use-speech-recognition';
import { routes } from '@/lib/routes';

jest.mock('@/lib/speech/use-speech-recognition');

const mockUseSpeechRecognition = useSpeechRecognition as jest.MockedFunction<
  typeof useSpeechRecognition
>;

/** The onFinal handler VoiceInputBar registered on its last render. */
let onFinal: ((transcript: string) => void) | undefined;
const start = jest.fn();
const stop = jest.fn();

/** Drive a final transcript through the bar inside act(). */
const speak = (transcript: string) => act(() => onFinal!(transcript));

function mockSpeech(state: {
  listening?: boolean;
  transcript?: string;
  error?: string | null;
  modelProgress?: number | null;
  available?: boolean;
}) {
  mockUseSpeechRecognition.mockImplementation((handler) => {
    onFinal = handler;
    return {
      listening: state.listening ?? false,
      transcript: state.transcript ?? '',
      error: state.error ?? null,
      modelProgress: state.modelProgress ?? null,
      available: state.available ?? true,
      start,
      stop,
    };
  });
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function renderBar(initialPath: string = routes.dashboard) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <main>
                <h1>Page</h1>
              </main>
              <VoiceInputBar />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  onFinal = undefined;
  start.mockClear();
  stop.mockClear();
  mockSpeech({});
});

describe('VoiceInputBar', () => {
  it('renders the idle hint and the keyboard badge', () => {
    renderBar();
    expect(
      screen.getByText('Tap to speak a command, or press Ctrl+Space.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Ctrl Space')).toBeInTheDocument();
  });

  it('starts a session when the mic is tapped', async () => {
    renderBar();
    await userEvent.click(
      screen.getByRole('button', { name: 'Start voice command' }),
    );
    expect(start).toHaveBeenCalled();
  });

  it('stops the session when tapped while listening', async () => {
    mockSpeech({ listening: true });
    renderBar();
    const mic = screen.getByRole('button', { name: 'Stop voice command' });
    expect(mic).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(mic);
    expect(stop).toHaveBeenCalled();
  });

  it('shows the live transcript while listening', () => {
    mockSpeech({ listening: true, transcript: 'open medi' });
    renderBar();
    expect(screen.getByText('open medi')).toBeInTheDocument();
  });

  it('shows the last error when idle', () => {
    mockSpeech({ error: 'Microphone access was denied.' });
    renderBar();
    expect(screen.getByText('Microphone access was denied.')).toBeInTheDocument();
  });

  it('shows model download progress while the model loads', () => {
    mockSpeech({ listening: true, modelProgress: 42 });
    renderBar();
    expect(
      screen.getByText('Downloading voice model… 42%'),
    ).toBeInTheDocument();
  });

  it('shows a preparing message when the download is done but the model is still loading', () => {
    mockSpeech({ listening: true, modelProgress: 100 });
    renderBar();
    expect(
      screen.getByText('Preparing voice recognition…'),
    ).toBeInTheDocument();
  });

  it('prefers the live transcript over download progress', () => {
    mockSpeech({ listening: true, transcript: 'open medi', modelProgress: 80 });
    renderBar();
    expect(screen.getByText('open medi')).toBeInTheDocument();
  });

  it('announces errors assertively for screen readers', () => {
    mockSpeech({ error: 'The microphone is in use by another application.' });
    renderBar();
    expect(useAnnouncerStore.getState().assertive).toBe(
      'The microphone is in use by another application.',
    );
  });

  it('styles the status as an error while one is shown', () => {
    mockSpeech({ error: 'Microphone access was denied.' });
    renderBar();
    expect(screen.getByText('Microphone access was denied.')).toHaveClass(
      'error',
    );
  });

  it('explains unavailability instead of starting', async () => {
    mockSpeech({ available: false });
    renderBar();
    await userEvent.click(
      screen.getByRole('button', { name: 'Start voice command' }),
    );
    expect(start).not.toHaveBeenCalled();
    expect(
      screen.getByText('Voice input is not available in this environment.'),
    ).toBeInTheDocument();
  });

  describe('dispatching final transcripts', () => {
    it('runs a registered command and announces its feedback', () => {
      renderBar();
      const run = jest.fn(() => 'Medication logged.');
      useVoiceRegistryStore.getState().register({
        id: 'test-screen',
        kind: 'screen',
        commands: [{ phrases: ['take medication'], run }],
      });

      speak('Take medication.');
      expect(run).toHaveBeenCalled();
      expect(screen.getByText('Medication logged.')).toBeInTheDocument();
      expect(useAnnouncerStore.getState().polite).toBe('Medication logged.');
    });

    it('echoes the transcript for a handled command without feedback', () => {
      renderBar();
      useVoiceRegistryStore.getState().register({
        id: 'test-screen',
        kind: 'screen',
        commands: [{ phrases: ['snooze'], run: () => undefined }],
      });
      speak('snooze');
      expect(screen.getByText('Heard: "snooze"')).toBeInTheDocument();
    });

    it('dictates into the focused text field of an open dialog', () => {
      renderBar();
      render(
        <div role="dialog" aria-label="Add">
          <label htmlFor="med-name">Name</label>
          <input id="med-name" type="text" />
        </div>,
      );
      const input = screen.getByLabelText('Name');
      input.focus();

      speak('Aspirin');
      expect(input).toHaveValue('Aspirin');
      expect(screen.getByText('Added to Name.')).toBeInTheDocument();
    });

    it('clicks a dialog button by name', () => {
      renderBar();
      const onSave = jest.fn();
      render(
        <div role="dialog" aria-label="Add">
          <button type="button" onClick={onSave}>
            Save
          </button>
        </div>,
      );
      speak('save');
      expect(onSave).toHaveBeenCalled();
    });

    it('dictates into a focused main-content field before navigation keywords', () => {
      mockSpeech({});
      render(
        <MemoryRouter initialEntries={[routes.messages]}>
          <main>
            <label htmlFor="message-input">Message Dr. Park</label>
            <input id="message-input" type="text" />
          </main>
          <VoiceInputBar />
          <LocationProbe />
        </MemoryRouter>,
      );
      const input = screen.getByLabelText('Message Dr. Park');
      input.focus();

      // Contains the nav keyword "appointment" — dictation must win.
      speak("I'll bring the log to my appointment.");
      expect(input).toHaveValue("I'll bring the log to my appointment.");
      expect(screen.getByText('Added to Message Dr. Park.')).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent(routes.messages);
    });

    it('navigates on a navigation keyword', () => {
      renderBar();
      speak('go to medications');
      expect(screen.getByTestId('location')).toHaveTextContent(
        routes.medications,
      );
      expect(screen.getByText('Opening Medications.')).toBeInTheDocument();
    });

    it('reports when already on the spoken page', () => {
      renderBar(routes.medications);
      speak('open medications');
      expect(screen.getByText('Already on Medications.')).toBeInTheDocument();
    });

    it('clicks a visible main-content button by name', () => {
      mockSpeech({});
      const onExport = jest.fn();
      render(
        <MemoryRouter initialEntries={[routes.dashboard]}>
          <main>
            <button type="button" onClick={onExport}>
              Export log
            </button>
          </main>
          <VoiceInputBar />
        </MemoryRouter>,
      );
      speak('Export log');
      expect(onExport).toHaveBeenCalled();
    });

    it('falls back to a help hint with an assertive announcement', () => {
      renderBar();
      speak('play some music');
      expect(
        screen.getByText('Heard: "play some music" — say "what can I say" for options.'),
      ).toBeInTheDocument();
      expect(useAnnouncerStore.getState().assertive).toBe(
        'Command not recognized. Say "what can I say" for options.',
      );
    });
  });

  describe('feedback visibility while listening', () => {
    it('shows command feedback in the bar during a continuous session', () => {
      mockSpeech({ listening: true, transcript: '' });
      renderBar();
      useVoiceRegistryStore.getState().register({
        id: 'test-screen',
        kind: 'screen',
        commands: [{ phrases: ['take medication'], run: () => 'Medication logged.' }],
      });

      speak('take medication');
      expect(screen.getByText('Medication logged.')).toBeInTheDocument();
    });

    it('prefers the live transcript over stale feedback', () => {
      mockSpeech({ listening: true, transcript: 'open medi' });
      renderBar();
      expect(screen.getByText('open medi')).toBeInTheDocument();
    });
  });

  describe('help panel', () => {
    it('"what can I say" opens a visible panel listing commands', () => {
      renderBar();
      useVoiceRegistryStore.getState().register({
        id: 'test-screen',
        kind: 'screen',
        commands: [{ phrases: ['snooze'], hint: 'snooze', run: jest.fn() }],
      });

      speak('what can I say');
      const panel = screen.getByRole('region', { name: 'Voice commands' });
      expect(within(panel).getByText('snooze')).toBeInTheDocument();
      expect(within(panel).getByText('stop listening')).toBeInTheDocument();
      expect(within(panel).getByText('On this page')).toBeInTheDocument();
      expect(within(panel).getByText('Anywhere')).toBeInTheDocument();
    });

    it('closes by voice and by the close button', async () => {
      renderBar();
      speak('what can I say');
      expect(screen.getByRole('region', { name: 'Voice commands' })).toBeInTheDocument();

      speak('close help');
      expect(
        screen.queryByRole('region', { name: 'Voice commands' }),
      ).not.toBeInTheDocument();

      speak('help');
      await userEvent.click(screen.getByRole('button', { name: 'Close voice help' }));
      expect(
        screen.queryByRole('region', { name: 'Voice commands' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('global commands', () => {
    it('"clear <field>" empties a dialog field by its label', () => {
      renderBar();
      render(
        <div role="dialog" aria-label="Add">
          <label htmlFor="med-name">Name</label>
          <input id="med-name" type="text" defaultValue="Asprin typo" />
        </div>,
      );
      speak('clear name');
      expect(screen.getByLabelText('Name')).toHaveValue('');
      expect(screen.getByText('Cleared Name.')).toBeInTheDocument();
    });

    it('"clear" empties the focused text field', () => {
      renderBar();
      render(
        <main>
          <label htmlFor="message-input">Message Dr. Park</label>
          <input id="message-input" type="text" defaultValue="oops" />
        </main>,
      );
      const input = screen.getByLabelText('Message Dr. Park');
      input.focus();
      speak('clear');
      expect(input).toHaveValue('');
      expect(screen.getByText('Cleared Message Dr. Park.')).toBeInTheDocument();
    });

    it('reports when there is nothing to clear', () => {
      renderBar();
      speak('clear');
      expect(
        screen.getByText('Focus a text field first, or say "clear" plus the field name.'),
      ).toBeInTheDocument();
      speak('clear dosage');
      expect(
        screen.getByText('Could not find a "dosage" field to clear.'),
      ).toBeInTheDocument();
    });

    it('"stop listening" ends the session', () => {
      mockSpeech({ listening: true });
      renderBar();
      speak('stop listening');
      expect(stop).toHaveBeenCalled();
      expect(useAnnouncerStore.getState().polite).toBe('Voice commands off.');
    });

    it('"what can I say" announces that the help panel opened', () => {
      renderBar();
      speak('what can I say');
      expect(useAnnouncerStore.getState().polite).toBe(
        'Showing what you can say. Say "close help" when done.',
      );
    });
  });

  describe('e2e transcript seam', () => {
    it('routes injected transcripts through the dispatcher', () => {
      renderBar();
      act(() => {
        document.dispatchEvent(
          new CustomEvent('careconnect:voice-transcript', {
            detail: 'go to messages',
          }),
        );
      });
      expect(screen.getByTestId('location')).toHaveTextContent(routes.messages);
    });

    it('ignores events without a string detail', () => {
      renderBar();
      expect(() =>
        document.dispatchEvent(
          new CustomEvent('careconnect:voice-transcript', { detail: 42 }),
        ),
      ).not.toThrow();
    });
  });
});
