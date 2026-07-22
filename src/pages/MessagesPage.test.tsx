import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MemoryRouter } from 'react-router-dom';
import { App } from '@/App';
import { routes } from '@/lib/routes';
import { dispatchVoiceCommand, type DispatchResult } from '@/lib/voice/voice-registry';
import { useAuthStore } from '@/stores/auth-store';
import { useMessagesStore } from '@/stores/messages-store';

/** Dispatch a transcript inside act() since command handlers set state. */
const speak = (transcript: string): DispatchResult => {
  let result: DispatchResult = { handled: false };
  act(() => {
    result = dispatchVoiceCommand(transcript);
  });
  return result;
};

const renderMessages = () => {
  useAuthStore.setState({ signedIn: true, email: 'demo@careconnect.app' });
  return render(
    <MemoryRouter initialEntries={[routes.messages]}>
      <App />
    </MemoryRouter>,
  );
};

describe('MessagesPage', () => {
  it('lists conversations with the unread indicator', () => {
    renderMessages();
    const list = screen.getByRole('region', { name: 'Conversations' });
    const drPark = within(list).getByRole('button', { name: /Dr\. Park/ });
    expect(drPark).toHaveTextContent('Unread');
    expect(within(list).getByRole('button', { name: /Nurse/ })).toBeInTheDocument();
  });

  it('opens a thread, marks it read, and moves focus to the thread heading', async () => {
    const user = userEvent.setup();
    renderMessages();

    await user.click(screen.getByRole('button', { name: /Dr\. Park/ }));
    const thread = screen.getByRole('list', { name: 'Messages with Dr. Park' });
    expect(within(thread).getByText('Please bring your symptom log.')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 2, name: 'Dr. Park' })).toHaveFocus(),
    );
    expect(
      useMessagesStore.getState().conversations.find((c) => c.id === 'dr-park')?.unread,
    ).toBe(false);
  });

  it('sends a reply that appears as an outgoing bubble', async () => {
    const user = userEvent.setup();
    renderMessages();

    await user.click(screen.getByRole('button', { name: /Dr\. Park/ }));
    const input = screen.getByLabelText('Message Dr. Park');
    const send = screen.getByRole('button', { name: 'Send' });
    expect(send).toBeDisabled();

    await user.type(input, 'I will bring the log.');
    await user.click(send);

    const thread = screen.getByRole('list', { name: 'Messages with Dr. Park' });
    expect(within(thread).getByText('I will bring the log.')).toBeInTheDocument();
    expect(input).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('Message sent to Dr. Park.');
  });

  it('returns to the conversation list with the back button', async () => {
    const user = userEvent.setup();
    renderMessages();

    await user.click(screen.getByRole('button', { name: /Dr\. Park/ }));
    await user.click(screen.getByRole('button', { name: /All conversations/ }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 2, name: 'Conversations' })).toHaveFocus(),
    );
    expect(screen.getByText('Select a conversation to read and reply.')).toBeInTheDocument();
  });

  it('supports arrow-key navigation across the conversation list', async () => {
    const user = userEvent.setup();
    renderMessages();

    const drPark = screen.getByRole('button', { name: /Dr\. Park/ });
    drPark.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: /Nurse/ })).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(drPark).toHaveFocus();
  });

  it('walks conversations, drafts, and sends a reply by voice', () => {
    renderMessages();

    expect(speak('send').feedback).toBe('Open a conversation first.');
    expect(speak('next conversation').feedback).toMatch(/^Opened the conversation with/);

    expect(speak('send').feedback).toBe(
      'The reply is empty. Say "reply" followed by your message.',
    );
    expect(speak('reply I will bring the symptom log').feedback).toBe(
      'Reply drafted: I will bring the symptom log. Say "send" to send it.',
    );
    expect(speak('send').feedback).toMatch(/^Message sent to /);
    const thread = screen.getByRole('list', { name: /Messages with/ });
    expect(
      within(thread).getByText('I will bring the symptom log'),
    ).toBeInTheDocument();

    expect(speak('previous conversation').feedback).toMatch(
      /^Opened the conversation with/,
    );
    expect(speak('back').feedback).toBe('Showing all conversations.');
    expect(speak('back').feedback).toBe('Already showing all conversations.');
  });

  it('opens a conversation by contact name via voice', () => {
    renderMessages();

    expect(speak('open Dr. Park').feedback).toBe('Opened the conversation with Dr. Park.');
    expect(
      screen.getByRole('list', { name: 'Messages with Dr. Park' }),
    ).toBeInTheDocument();

    // "doctor" spoken form matches the abbreviated "Dr." contact name.
    speak('back');
    expect(speak('open doctor park').feedback).toBe(
      'Opened the conversation with Dr. Park.',
    );

    expect(speak('open conversation with the nurse').feedback).toBe(
      'Opened the conversation with Nurse.',
    );

    expect(speak('open casper').feedback).toBe(
      'Sorry, I could not find a conversation with "casper".',
    );
  });

  it('reads the latest message aloud when speech synthesis exists', () => {
    const speakSpy = jest.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      value: { speak: speakSpy, cancel: jest.fn() },
      configurable: true,
    });
    (globalThis as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance =
      class {
        constructor(public text: string) {}
      };

    renderMessages();
    expect(speak('read aloud').feedback).toBe('Open a conversation first.');
    speak('next conversation');
    expect(speak('read aloud').feedback).toMatch(/^Reading the latest message from/);
    expect(speakSpy).toHaveBeenCalledTimes(1);
    expect((speakSpy.mock.calls[0][0] as { text: string }).text).toMatch(/wrote:/);

    delete (window as { speechSynthesis?: unknown }).speechSynthesis;
    delete (globalThis as { SpeechSynthesisUtterance?: unknown })
      .SpeechSynthesisUtterance;
  });

  it('reports when read aloud is unsupported', () => {
    renderMessages();
    speak('next conversation');
    expect(speak('read aloud').feedback).toBe(
      'Read aloud is not supported in this browser.',
    );
  });

  it('has no automated axe violations with a thread open', async () => {
    const user = userEvent.setup();
    renderMessages();
    await user.click(screen.getByRole('button', { name: /Dr\. Park/ }));

    const result = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
