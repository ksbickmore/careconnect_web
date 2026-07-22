import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmergencyCountdown } from './EmergencyCountdown';
import { useAnnouncerStore } from '@/stores/announcer-store';

describe('EmergencyCountdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('exposes alertdialog semantics and focuses the Cancel button', () => {
    render(
      <EmergencyCountdown target="911" onCancel={jest.fn()} onComplete={jest.fn()} />,
    );
    const dialog = screen.getByRole('alertdialog', { name: 'Calling 911' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: /Cancel call/ })).toHaveFocus();
  });

  it('announces the countdown assertively once on open', () => {
    render(
      <EmergencyCountdown
        target="911"
        seconds={5}
        onCancel={jest.fn()}
        onComplete={jest.fn()}
      />,
    );
    expect(useAnnouncerStore.getState().assertive).toBe(
      'Calling 911 in 5 seconds. Press Cancel or Escape to stop.',
    );
  });

  it('counts down each second and completes at zero', () => {
    const onComplete = jest.fn();
    render(
      <EmergencyCountdown
        target="911"
        seconds={3}
        onCancel={jest.fn()}
        onComplete={onComplete}
      />,
    );
    expect(screen.getByText('3')).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(1000));
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();

    // Each tick schedules the next timeout in an effect, so advance per second.
    act(() => jest.advanceTimersByTime(1000));
    act(() => jest.advanceTimersByTime(1000));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('cancels via the button', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onCancel = jest.fn();
    render(
      <EmergencyCountdown target="911" onCancel={onCancel} onComplete={jest.fn()} />,
    );
    await user.click(screen.getByRole('button', { name: /Cancel call/ }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('cancels via Escape', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onCancel = jest.fn();
    render(
      <EmergencyCountdown target="911" onCancel={onCancel} onComplete={jest.fn()} />,
    );
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
