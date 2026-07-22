import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MemoryRouter } from 'react-router-dom';
import { App } from '@/App';
import { routes } from '@/lib/routes';
import { dispatchVoiceCommand, type DispatchResult } from '@/lib/voice/voice-registry';
import { useAuthStore } from '@/stores/auth-store';
import { useMedicationsStore } from '@/stores/medications-store';
import { useSettingsStore } from '@/stores/settings-store';

/** Dispatch a transcript inside act() since command handlers set state. */
const speak = (transcript: string): DispatchResult => {
  let result: DispatchResult = { handled: false };
  act(() => {
    result = dispatchVoiceCommand(transcript);
  });
  return result;
};

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

  it('changes text size and reduced motion by voice', () => {
    renderSettings();

    expect(speak('text size extra large').feedback).toBe('Text size set to Extra large.');
    expect(useSettingsStore.getState().textZoom).toBe(1.3);
    expect(speak('text size large').feedback).toBe('Text size set to Large.');
    expect(useSettingsStore.getState().textZoom).toBe(1.15);
    expect(speak('text size standard').feedback).toBe('Text size set to Standard.');
    expect(useSettingsStore.getState().textZoom).toBe(1);
    expect(speak('text size gigantic').feedback).toBe(
      'Say "text size" followed by standard, large, or extra large.',
    );

    expect(speak('reduced motion on').feedback).toBe('Reduce motion turned on.');
    expect(useSettingsStore.getState().reducedMotion).toBe(true);
    expect(speak('reduced motion off').feedback).toBe('Reduce motion turned off.');
    expect(useSettingsStore.getState().reducedMotion).toBe(false);
  });

  it('has no automated axe violations', async () => {
    renderSettings();
    const result = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
