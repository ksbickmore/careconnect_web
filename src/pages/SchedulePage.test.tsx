import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MemoryRouter } from 'react-router-dom';
import { App } from '@/App';
import { routes } from '@/lib/routes';
import { useAppointmentsStore } from '@/stores/appointments-store';
import { useAuthStore } from '@/stores/auth-store';

const renderSchedule = () => {
  useAuthStore.setState({ signedIn: true, email: 'demo@careconnect.app' });
  return render(
    <MemoryRouter initialEntries={[routes.schedule]}>
      <App />
    </MemoryRouter>,
  );
};

describe('SchedulePage', () => {
  it('defaults to the week view with the seeded appointments', () => {
    renderSchedule();
    expect(screen.getByRole('tab', { name: 'Week' })).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByRole('button', { name: /Physical Therapy/ })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: /Nurse check-in/ })).toBeInTheDocument();
  });

  it('shows only today in the day view', async () => {
    const user = userEvent.setup();
    renderSchedule();

    await user.click(screen.getByRole('tab', { name: 'Day' }));
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByRole('button', { name: /Physical Therapy/ })).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: /Nurse check-in/ })).not.toBeInTheDocument();
  });

  it('renders the month view as a real table with weekday headers and events', async () => {
    const user = userEvent.setup();
    renderSchedule();

    await user.click(screen.getByRole('tab', { name: 'Month' }));
    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Sun' })).toBeInTheDocument();
    expect(within(table).getAllByRole('columnheader')).toHaveLength(7);
    expect(within(table).getByRole('button', { name: /Physical Therapy/ })).toBeInTheDocument();
  });

  it('opens the detail dialog and sets a reminder with the two-step confirm', async () => {
    const user = userEvent.setup();
    renderSchedule();

    await user.click(screen.getByRole('button', { name: /Physical Therapy/ }));
    const dialog = screen.getByRole('dialog', { name: 'Physical Therapy' });
    expect(dialog).toHaveTextContent('UMGC Medical');

    const confirm = within(dialog).getByRole('button', { name: 'Set reminder' });
    await user.click(confirm);
    expect(confirm).toHaveTextContent('Tap again to confirm');
    await user.click(confirm);

    expect(screen.getByRole('status')).toHaveTextContent('Reminder set for Physical Therapy.');
    expect(
      useAppointmentsStore.getState().appointments.find((a) => a.id === 'physical-therapy'),
    ).toMatchObject({ status: 'reminderSet' });
  });

  it('validates and adds a new appointment through the dialog', async () => {
    const user = userEvent.setup();
    renderSchedule();

    await user.click(screen.getByRole('button', { name: 'New appointment' }));
    const dialog = screen.getByRole('dialog', { name: 'New appointment' });

    await user.click(within(dialog).getByRole('button', { name: 'Save appointment' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Enter a title, date, and time.');

    await user.type(within(dialog).getByLabelText('Title'), 'Eye exam');
    await user.type(within(dialog).getByLabelText('Date'), '2026-08-03');
    await user.type(within(dialog).getByLabelText('Time'), '09:30');
    await user.click(within(dialog).getByRole('button', { name: 'Save appointment' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Eye exam added to your schedule');
    expect(
      useAppointmentsStore.getState().appointments.some((a) => a.title === 'Eye exam'),
    ).toBe(true);
  });

  it('has no automated axe violations in list and month views', async () => {
    const user = userEvent.setup();
    renderSchedule();

    let result = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations).toEqual([]);

    await user.click(screen.getByRole('tab', { name: 'Month' }));
    result = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
