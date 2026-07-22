import { act, render, screen } from '@testing-library/react';
import { OfflineBanner } from './OfflineBanner';
import { useAnnouncerStore } from '@/stores/announcer-store';

describe('OfflineBanner', () => {
  it('renders nothing while online', () => {
    render(<OfflineBanner />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the banner and announces when the browser goes offline', () => {
    render(<OfflineBanner />);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      "You're offline — showing saved data.",
    );
    expect(useAnnouncerStore.getState().polite).toBe(
      "You're offline. Saved data is still available.",
    );

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(useAnnouncerStore.getState().polite).toBe("You're back online.");
  });
});
