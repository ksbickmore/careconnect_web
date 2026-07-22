import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MemoryRouter } from 'react-router-dom';
import { App } from '@/App';
import { routes } from '@/lib/routes';
import { dispatchVoiceCommand, type DispatchResult } from '@/lib/voice/voice-registry';
import { useAppointmentsStore } from '@/stores/appointments-store';
import { useAuthStore } from '@/stores/auth-store';

/** Dispatch a transcript inside act() since command handlers set state. */
const speak = (transcript: string): DispatchResult => {
  let result: DispatchResult = { handled: false };
  act(() => {
    result = dispatchVoiceCommand(transcript);
  });
  return result;
};

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

  it('switches calendar views by voice', () => {
    renderSchedule();

    expect(speak('day view').feedback).toBe('Showing the day view.');
    expect(screen.getByRole('tab', { name: 'Day' })).toHaveAttribute('aria-selected', 'true');

    expect(speak('month view').feedback).toBe('Showing the month view.');
    expect(screen.getByRole('table')).toBeInTheDocument();

    expect(speak('week view').feedback).toBe('Showing the week view.');
    expect(screen.getByRole('tab', { name: 'Week' })).toHaveAttribute('aria-selected', 'true');
  });

  it('creates an appointment end-to-end by voice', () => {
    renderSchedule();

    expect(speak('add appointment').feedback).toBe('Opening the new appointment form.');
    const dialog = screen.getByRole('dialog', { name: 'New appointment' });

    expect(speak('title Dental cleaning').feedback).toBe('Title set to Dental cleaning.');
    expect(within(dialog).getByLabelText('Title')).toHaveValue('Dental cleaning');

    expect(speak('date tomorrow').feedback).toMatch(/^Date set to /);
    expect(within(dialog).getByLabelText<HTMLInputElement>('Date').value).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );

    expect(speak('time 9 30 am').feedback).toBe('Time set to 9:30 AM.');
    expect(within(dialog).getByLabelText('Time')).toHaveValue('09:30');

    speak('save');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      useAppointmentsStore.getState().appointments.some((a) => a.title === 'Dental cleaning'),
    ).toBe(true);
  });

  it('fills the clinician and location fields by voice', () => {
    renderSchedule();
    speak('add appointment');
    const dialog = screen.getByRole('dialog', { name: 'New appointment' });

    expect(speak('clinician Doctor Smith').feedback).toBe('Clinician set to Doctor Smith.');
    expect(within(dialog).getByLabelText('Clinician')).toHaveValue('Doctor Smith');

    expect(speak('location Main Street Clinic').feedback).toBe(
      'Location set to Main Street Clinic.',
    );
    expect(within(dialog).getByLabelText('Location')).toHaveValue('Main Street Clinic');
  });

  it('reports unparseable spoken dates and times and supports cancel', () => {
    renderSchedule();
    speak('add appointment');

    expect(speak('date the day after whenever').feedback).toMatch(
      /did not understand the date/,
    );
    expect(speak('time gibberish').feedback).toMatch(/did not understand the time/);

    expect(speak('cancel').feedback).toBe('Closed without saving.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
