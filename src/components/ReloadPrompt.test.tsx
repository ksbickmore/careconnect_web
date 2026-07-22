import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ReloadPrompt } from './ReloadPrompt';
import { useAnnouncerStore } from '@/stores/announcer-store';

jest.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: jest.fn(),
}));

const mockUseRegisterSW = useRegisterSW as jest.Mock;

const swState = ({
  needRefresh = false,
  offlineReady = false,
  setNeedRefresh = jest.fn(),
  updateServiceWorker = jest.fn(() => Promise.resolve()),
} = {}) => ({
  needRefresh: [needRefresh, setNeedRefresh],
  offlineReady: [offlineReady, jest.fn()],
  updateServiceWorker,
});

describe('ReloadPrompt', () => {
  it('renders nothing when no update is waiting', () => {
    mockUseRegisterSW.mockReturnValue(swState());
    render(<ReloadPrompt />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('announces politely when the app becomes offline-ready', () => {
    mockUseRegisterSW.mockReturnValue(swState({ offlineReady: true }));
    render(<ReloadPrompt />);
    expect(useAnnouncerStore.getState().polite).toBe(
      'CareConnect is ready to work offline.',
    );
  });

  it('shows the update banner and reloads on confirm', async () => {
    const user = userEvent.setup();
    const updateServiceWorker = jest.fn(() => Promise.resolve());
    mockUseRegisterSW.mockReturnValue(swState({ needRefresh: true, updateServiceWorker }));
    render(<ReloadPrompt />);

    expect(screen.getByRole('status')).toHaveTextContent('A new version of CareConnect');
    await user.click(screen.getByRole('button', { name: /Reload now/ }));
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('can be dismissed with Later', async () => {
    const user = userEvent.setup();
    const setNeedRefresh = jest.fn();
    mockUseRegisterSW.mockReturnValue(swState({ needRefresh: true, setNeedRefresh }));
    render(<ReloadPrompt />);

    await user.click(screen.getByRole('button', { name: 'Later' }));
    expect(setNeedRefresh).toHaveBeenCalledWith(false);
  });
});
