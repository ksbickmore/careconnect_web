import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useArrowList } from './use-arrow-list';

function Harness({ items }: { items: readonly string[] }) {
  const { getItemProps } = useArrowList(items.length);
  return (
    <ul>
      {items.map((item, i) => (
        <li key={item}>
          <button type="button" {...getItemProps(i)}>
            {item}
          </button>
        </li>
      ))}
    </ul>
  );
}

const items = ['Alpha', 'Beta', 'Gamma'];

describe('useArrowList', () => {
  it('keeps only one item in the Tab order', () => {
    render(<Harness items={items} />);
    expect(screen.getByRole('button', { name: 'Alpha' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('button', { name: 'Beta' })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('button', { name: 'Gamma' })).toHaveAttribute('tabindex', '-1');
  });

  it('moves focus with ArrowDown and ArrowUp, clamped at the ends', async () => {
    const user = userEvent.setup();
    render(<Harness items={items} />);
    screen.getByRole('button', { name: 'Alpha' }).focus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'Beta' })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}'); // clamped at the last item
    expect(screen.getByRole('button', { name: 'Gamma' })).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('button', { name: 'Beta' })).toHaveFocus();
  });

  it('jumps with Home and End and updates the roving tabindex', async () => {
    const user = userEvent.setup();
    render(<Harness items={items} />);
    screen.getByRole('button', { name: 'Alpha' }).focus();

    await user.keyboard('{End}');
    const gamma = screen.getByRole('button', { name: 'Gamma' });
    expect(gamma).toHaveFocus();
    expect(gamma).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('button', { name: 'Alpha' })).toHaveAttribute('tabindex', '-1');

    await user.keyboard('{Home}');
    expect(screen.getByRole('button', { name: 'Alpha' })).toHaveFocus();
  });
});
