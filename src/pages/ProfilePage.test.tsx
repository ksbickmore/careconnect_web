import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MemoryRouter } from 'react-router-dom';
import { App } from '@/App';
import { routes } from '@/lib/routes';
import { useAuthStore } from '@/stores/auth-store';

const renderProfile = (email: string | null = 'demo@careconnect.app') => {
  useAuthStore.setState({ signedIn: true, email });
  return render(
    <MemoryRouter initialEntries={[routes.profile]}>
      <App />
    </MemoryRouter>,
  );
};

describe('ProfilePage', () => {
  it('shows the account details from the auth store', () => {
    renderProfile();
    expect(screen.getByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByText('Demo')).toBeInTheDocument();
    expect(screen.getByText('demo@careconnect.app')).toBeInTheDocument();
  });

  it('falls back to a guest identity when no email is present', () => {
    renderProfile(null);
    const account = screen.getByRole('region', { name: 'Account' });
    expect(within(account).getByText('Guest')).toBeInTheDocument();
    expect(within(account).getByText(/Guest session/)).toBeInTheDocument();
  });

  it('lists the full care team', () => {
    renderProfile();
    const careTeam = screen.getByRole('region', { name: 'Care team' });
    expect(careTeam).toHaveTextContent('Sarah Vance');
    expect(careTeam).toHaveTextContent('Dr. Park');
    expect(careTeam).toHaveTextContent('Nurse');
    expect(careTeam).toHaveTextContent('Michael Kim');
  });

  it('signs out and returns to the login page', async () => {
    const user = userEvent.setup();
    renderProfile();

    const session = screen.getByRole('region', { name: 'Session' });
    await user.click(within(session).getByRole('button', { name: 'Sign out' }));
    expect(useAuthStore.getState().signedIn).toBe(false);
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('has no automated axe violations', async () => {
    renderProfile();
    const result = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
