import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MemoryRouter } from 'react-router-dom';
import { App } from '@/App';
import { routes } from '@/lib/routes';
import { dispatchVoiceCommand, type DispatchResult } from '@/lib/voice/voice-registry';
import { useAuthStore } from '@/stores/auth-store';

/** Dispatch a transcript inside act() since command handlers set state. */
const speak = (transcript: string): DispatchResult => {
  let result: DispatchResult = { handled: false };
  act(() => {
    result = dispatchVoiceCommand(transcript);
  });
  return result;
};

const renderEmergency = () => {
  useAuthStore.setState({ signedIn: true, email: 'demo@careconnect.app' });
  return render(
    <MemoryRouter initialEntries={[routes.emergency]}>
      <App />
    </MemoryRouter>,
  );
};

describe('EmergencyPage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const setupUser = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

  it('requires two activations before the 911 countdown starts', async () => {
    const user = setupUser();
    renderEmergency();

    const call = screen.getByRole('button', { name: 'Call 911' });
    await user.click(call);
    expect(call).toHaveTextContent('Tap again to confirm');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    await user.click(call);
    const dialog = screen.getByRole('alertdialog', { name: 'Calling 911' });
    expect(within(dialog).getByRole('button', { name: /Cancel call/ })).toHaveFocus();
  });

  it('cancelling the countdown stops the call', async () => {
    const user = setupUser();
    renderEmergency();

    const call = screen.getByRole('button', { name: 'Call 911' });
    await user.click(call);
    await user.click(call);
    await user.click(screen.getByRole('button', { name: /Cancel call/ }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Call cancelled.');
    expect(screen.queryByRole('status', { name: 'Call status' })).not.toBeInTheDocument();
  });

  it('connects (simulated) when the countdown elapses and can be ended', async () => {
    const user = setupUser();
    renderEmergency();

    const call = screen.getByRole('button', { name: 'Call 911' });
    await user.click(call);
    await user.click(call);

    for (let i = 0; i < 5; i += 1) {
      act(() => jest.advanceTimersByTime(1000));
    }

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    const statusCard = screen.getByRole('status', { name: 'Call status' });
    expect(statusCard).toHaveTextContent('Connecting to 911…');

    await user.click(screen.getByRole('button', { name: 'End call' }));
    expect(screen.queryByRole('status', { name: 'Call status' })).not.toBeInTheDocument();
  });

  it('offers the primary caregiver and other contacts as call targets', async () => {
    const user = setupUser();
    renderEmergency();

    expect(screen.getByRole('heading', { name: 'Call Sarah Vance' })).toBeInTheDocument();

    const others = screen.getByRole('region', { name: 'Other care-team contacts' });
    const callButtons = within(others).getAllByRole('button', { name: 'Call' });
    expect(callButtons).toHaveLength(3);

    await user.click(callButtons[0]);
    expect(screen.getByRole('alertdialog', { name: 'Calling Dr. Park' })).toBeInTheDocument();
  });

  it('arms and confirms a 911 call by voice, then cancels the countdown', () => {
    renderEmergency();

    expect(speak('confirm').feedback).toBe('Nothing is waiting for confirmation.');
    expect(speak('cancel').feedback).toBe('No call to cancel.');

    speak('call 911');
    expect(screen.getByRole('button', { name: /Tap again to confirm/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    speak('confirm');
    expect(screen.getByRole('alertdialog', { name: 'Calling 911' })).toBeInTheDocument();

    speak('cancel');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Call cancelled.');
  });

  it('calls the caregiver and ends the connected call by voice', () => {
    renderEmergency();

    expect(speak('end call').feedback).toBe('No call in progress.');

    speak('call caregiver');
    speak('confirm');
    expect(
      screen.getByRole('alertdialog', { name: 'Calling Sarah Vance' }),
    ).toBeInTheDocument();

    for (let i = 0; i < 5; i += 1) {
      act(() => jest.advanceTimersByTime(1000));
    }
    expect(screen.getByRole('status', { name: 'Call status' })).toHaveTextContent(
      'Connecting to Sarah Vance…',
    );

    speak('end call');
    expect(screen.queryByRole('status', { name: 'Call status' })).not.toBeInTheDocument();
  });

  it('has no automated axe violations', async () => {
    jest.useRealTimers(); // axe.run relies on real timers internally
    renderEmergency();
    const result = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
