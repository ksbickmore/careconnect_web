import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MemoryRouter } from 'react-router-dom';
import { App } from '@/App';
import { routes } from '@/lib/routes';
import { useAuthStore } from '@/stores/auth-store';

const renderMedications = () => {
  useAuthStore.setState({ signedIn: true, email: 'demo@careconnect.app' });
  return render(
    <MemoryRouter initialEntries={[routes.medications]}>
      <App />
    </MemoryRouter>,
  );
};

describe('MedicationsPage', () => {
  it('groups medications into Today and Completed sections', () => {
    renderMedications();
    const today = screen.getByRole('region', { name: 'Today' });
    expect(within(today).getAllByRole('button')).toHaveLength(3);

    const completed = screen.getByRole('region', { name: 'Completed' });
    expect(within(completed).getByRole('button', { name: /Aspirin/ })).toBeInTheDocument();
  });

  it('filters with the tablist and shows an empty message when nothing matches', async () => {
    const user = userEvent.setup();
    renderMedications();

    await user.click(screen.getByRole('tab', { name: /Taken/ }));
    expect(screen.queryByRole('region', { name: 'Today' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Aspirin/ })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /^Due/ }));
    expect(screen.queryByRole('button', { name: /Aspirin/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lisinopril/ })).toBeInTheDocument();
  });

  it('shows details for the selected medication', async () => {
    const user = userEvent.setup();
    renderMedications();

    await user.click(screen.getByRole('button', { name: /Lisinopril/ }));
    const detail = screen.getByRole('complementary', { name: 'Medication details' });
    expect(detail).toHaveTextContent('Take with water in the morning.');
    expect(detail).toHaveTextContent('Dr. Park');
    expect(detail).toHaveTextContent('12 days left');
  });

  it('logs a dose with the two-step confirm and announces it', async () => {
    const user = userEvent.setup();
    renderMedications();

    await user.click(screen.getByRole('button', { name: /Lisinopril/ }));
    const confirm = screen.getByRole('button', { name: 'Confirm taken' });
    await user.click(confirm);
    expect(confirm).toHaveTextContent('Tap again to confirm');

    await user.click(confirm);
    expect(screen.getByRole('status')).toHaveTextContent('Lisinopril 10 mg logged as taken.');
    const detail = screen.getByRole('complementary', { name: 'Medication details' });
    expect(within(detail).getByText('Taken')).toBeInTheDocument();
  });

  it('snoozes a medication into the reminder state', async () => {
    const user = userEvent.setup();
    renderMedications();

    await user.click(screen.getByRole('button', { name: /Vitamin B6/ }));
    await user.click(screen.getByRole('button', { name: /Snooze/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Vitamin B6 snoozed.');
    const detail = screen.getByRole('complementary', { name: 'Medication details' });
    expect(within(detail).getByText('Reminder set')).toBeInTheDocument();
  });

  it('supports arrow-key navigation across the medication list', async () => {
    const user = userEvent.setup();
    renderMedications();

    const lisinopril = screen.getByRole('button', { name: /Lisinopril/ });
    lisinopril.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: /Ibuprofen/ })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('button', { name: /Aspirin/ })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(lisinopril).toHaveFocus();
  });

  it('adds a medication through the dialog and rejects duplicates inline', async () => {
    const user = userEvent.setup();
    renderMedications();

    await user.click(screen.getByRole('button', { name: 'Add medication' }));
    const dialog = screen.getByRole('dialog', { name: 'Add medication' });

    // Empty submit surfaces validation.
    await user.click(within(dialog).getByRole('button', { name: 'Save medication' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Enter both a medication name and a dose.',
    );

    await user.type(within(dialog).getByLabelText('Name'), 'Melatonin');
    await user.type(within(dialog).getByLabelText('Dose'), '3 mg');
    await user.click(within(dialog).getByRole('button', { name: 'Save medication' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Melatonin/ })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Melatonin 3 mg added');

    // Adding the same name + dose again collides on the slug id.
    await user.click(screen.getByRole('button', { name: 'Add medication' }));
    const again = screen.getByRole('dialog', { name: 'Add medication' });
    await user.type(within(again).getByLabelText('Name'), 'Melatonin');
    await user.type(within(again).getByLabelText('Dose'), '3 mg');
    await user.click(within(again).getByRole('button', { name: 'Save medication' }));
    expect(within(again).getByRole('alert')).toHaveTextContent('already exists');
  });

  it('has no automated axe violations', async () => {
    renderMedications();
    const result = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
