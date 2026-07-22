import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MemoryRouter } from 'react-router-dom';
import { App } from '@/App';
import { routes } from '@/lib/routes';
import { useAuthStore } from '@/stores/auth-store';
import { useHealthLogStore } from '@/stores/health-log-store';

const renderHealthLog = () => {
  useAuthStore.setState({ signedIn: true, email: 'demo@careconnect.app' });
  return render(
    <MemoryRouter initialEntries={[routes.healthLog]}>
      <App />
    </MemoryRouter>,
  );
};

describe('HealthLogPage', () => {
  it('exposes pain and sleep spinbuttons with sensible bounds', () => {
    renderHealthLog();
    const pain = screen.getByRole('spinbutton', { name: 'Pain level' });
    expect(pain).toHaveAttribute('aria-valuemin', '0');
    expect(pain).toHaveAttribute('aria-valuemax', '10');
    const sleep = screen.getByRole('spinbutton', { name: 'Sleep' });
    expect(sleep).toHaveAttribute('aria-valuemax', '14');
  });

  it('saves a new entry and shows it at the top of the history', async () => {
    const user = userEvent.setup();
    renderHealthLog();

    await user.click(screen.getByRole('button', { name: 'Increase Pain level' }));
    await user.click(screen.getByRole('button', { name: 'Decrease Sleep' }));
    await user.click(screen.getByRole('radio', { name: 'Low' }));
    await user.type(screen.getByLabelText(/Note/), 'Aching after typing.');
    await user.click(screen.getByRole('button', { name: 'Save entry' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Health entry saved. Pain 6 out of 10, sleep 6.5 hours.',
    );
    const history = screen.getByRole('region', { name: 'Recent entries' });
    expect(within(history).getByText('Aching after typing.')).toBeInTheDocument();
    expect(useHealthLogStore.getState().entries[0]).toMatchObject({
      painLevel: 6,
      sleepHours: 6.5,
      mood: 'Low',
    });
  });

  it('pages through the history without infinite scroll', async () => {
    const user = userEvent.setup();
    renderHealthLog();

    const history = screen.getByRole('region', { name: 'Recent entries' });
    expect(within(history).getByText('Page 1 of 2')).toBeInTheDocument();
    expect(within(history).getByText('Wed, May 27')).toBeInTheDocument();

    await user.click(within(history).getByRole('button', { name: 'Next page' }));
    expect(within(history).getByText('Sat, May 23')).toBeInTheDocument();
    expect(within(history).getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('exports the history as a downloadable text file', async () => {
    const user = userEvent.setup();
    const createObjectURL = jest.fn(() => 'blob:mock');
    const revokeObjectURL = jest.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    renderHealthLog();
    await user.click(screen.getByRole('button', { name: 'Export log' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    expect(screen.getByRole('status')).toHaveTextContent('Health log exported');
    click.mockRestore();
  });

  it('has no automated axe violations', async () => {
    renderHealthLog();
    const result = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
