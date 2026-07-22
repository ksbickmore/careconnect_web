import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MemoryRouter } from 'react-router-dom';
import { App } from '@/App';
import { routes } from '@/lib/routes';
import { useAuthStore } from '@/stores/auth-store';
import { useMedicationsStore } from '@/stores/medications-store';
import { useSettingsStore } from '@/stores/settings-store';

const renderSettings = () => {
  useAuthStore.setState({ signedIn: true, email: 'demo@careconnect.app' });
  return render(
    <MemoryRouter initialEntries={[routes.settings]}>
      <App />
    </MemoryRouter>,
  );
};

describe('SettingsPage', () => {
  it('exposes a labelled radio group for text size and a motion checkbox', () => {
    renderSettings();
    expect(screen.getByRole('group', { name: 'Text size' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Standard/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Reduce motion/ })).not.toBeChecked();
  });

  it('applies and persists the chosen text size', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole('radio', { name: /^Large/ }));
    expect(useSettingsStore.getState().textZoom).toBe(1.15);
    expect(
      (document.body.style as CSSStyleDeclaration & { zoom: string }).zoom,
    ).toBe('1.15');
    expect(localStorage.getItem('careconnect:web:v1:settings')).toContain('1.15');
    expect(screen.getByRole('status')).toHaveTextContent('Text size set to Large.');
  });

  it('toggles the reduce-motion root class', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole('checkbox', { name: /Reduce motion/ }));
    expect(document.documentElement).toHaveClass('reduce-motion');
    expect(useSettingsStore.getState().reducedMotion).toBe(true);

    await user.click(screen.getByRole('checkbox', { name: /Reduce motion/ }));
    expect(document.documentElement).not.toHaveClass('reduce-motion');
  });

  it('resets the demo data back to the seed', async () => {
    const user = userEvent.setup();
    useMedicationsStore.getState().markTaken('lisinopril-10mg');
    renderSettings();

    await user.click(screen.getByRole('button', { name: 'Reset demo data' }));
    const lisinopril = useMedicationsStore
      .getState()
      .medications.find((medication) => medication.id === 'lisinopril-10mg');
    expect(lisinopril).toMatchObject({ status: 'dueSoon' });
    expect(screen.getByRole('status')).toHaveTextContent('Demo data reset');
  });

  it('has no automated axe violations', async () => {
    renderSettings();
    const result = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
