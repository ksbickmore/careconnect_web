import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StepControl } from './StepControl';
import { useAnnouncerStore } from '@/stores/announcer-store';

function Harness({ initial = 5 }: { initial?: number }) {
  const [value, setValue] = useState(initial);
  return (
    <StepControl
      label="Pain level"
      value={value}
      min={0}
      max={10}
      unit="/ 10"
      onIncrement={() => setValue((v) => v + 1)}
      onDecrement={() => setValue((v) => v - 1)}
    />
  );
}

describe('StepControl', () => {
  it('exposes spinbutton semantics with the current value', () => {
    render(<Harness />);
    const spin = screen.getByRole('spinbutton', { name: 'Pain level' });
    expect(spin).toHaveAttribute('aria-valuenow', '5');
    expect(spin).toHaveAttribute('aria-valuemin', '0');
    expect(spin).toHaveAttribute('aria-valuemax', '10');
  });

  it('increments and decrements via the buttons and announces the change', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Increase Pain level' }));
    expect(screen.getByRole('spinbutton')).toHaveAttribute('aria-valuenow', '6');
    expect(useAnnouncerStore.getState().polite).toBe('Pain level: 6 / 10.');

    await user.click(screen.getByRole('button', { name: 'Decrease Pain level' }));
    expect(screen.getByRole('spinbutton')).toHaveAttribute('aria-valuenow', '5');
  });

  it('supports arrow keys on the focused spinbutton', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const spin = screen.getByRole('spinbutton');
    spin.focus();
    await user.keyboard('{ArrowUp}');
    expect(spin).toHaveAttribute('aria-valuenow', '6');
    await user.keyboard('{ArrowRight}');
    expect(spin).toHaveAttribute('aria-valuenow', '7');
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowLeft}');
    expect(spin).toHaveAttribute('aria-valuenow', '5');
  });

  it('disables the buttons at the bounds and clamps arrow keys', async () => {
    const user = userEvent.setup();
    render(<Harness initial={10} />);
    expect(screen.getByRole('button', { name: 'Increase Pain level' })).toBeDisabled();

    const spin = screen.getByRole('spinbutton');
    spin.focus();
    await user.keyboard('{ArrowUp}');
    expect(spin).toHaveAttribute('aria-valuenow', '10'); // clamped

    render(<Harness initial={0} />);
    expect(
      screen.getAllByRole('button', { name: 'Decrease Pain level' }).at(-1),
    ).toBeDisabled();
  });
});
