import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
import { routes } from '@/lib/routes';
import { useAuthStore } from '@/stores/auth-store';
import { useDashboardStore } from '@/stores/dashboard-store';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

describe('CareConnect routes and accessibility foundation', () => {
  it('renders the public landing page with its core landmarks and heading hierarchy', () => {
    renderAt(routes.landing);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Public' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Take care of yourself today.',
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Less effort. More confidence.',
    );
    expect(screen.queryByText(/medications taken/i)).not.toBeInTheDocument();
  });

  it('redirects a signed-out visitor from a protected route to the labelled login form', () => {
    renderAt(routes.dashboard);

    expect(screen.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('demo@careconnect.app');
    expect(screen.getByLabelText('Password')).toHaveValue('demo1234');
  });

  it('signs in and renders the responsive app shell and dashboard', async () => {
    const user = userEvent.setup();
    renderAt(routes.login);

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    expect(document.querySelector('nav[aria-label="Primary mobile"]')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Good morning, demo');
    expect(screen.getByRole('link', { name: /Dashboard/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
  });

  it('requires two activations before persisting a medication as taken', async () => {
    const user = userEvent.setup();
    useDashboardStore.getState().resetDemoData();
    renderAt(routes.login);
    await user.click(screen.getByRole('button', { name: 'Continue as guest' }));

    const confirm = screen.getByRole('button', { name: 'Confirm taken' });
    await user.click(confirm);
    expect(confirm).toHaveTextContent('Tap again to confirm');
    expect(confirm).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('1/3')).toBeInTheDocument();

    await user.click(confirm);
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('logged as taken');
  });

  it('shows an inline alert and stays on login when required values are empty', async () => {
    const user = userEvent.setup();
    renderAt(routes.login);
    await user.clear(screen.getByLabelText('Email'));
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter both an email address and password.',
    );
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('has no automated axe violations on the public landing page', async () => {
    renderAt(routes.landing);

    const result = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });

  it('has no automated axe violations on the authenticated dashboard', async () => {
    useAuthStore.setState({ signedIn: true, email: 'demo@careconnect.app' });
    renderAt(routes.dashboard);

    const result = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
