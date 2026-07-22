import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterTabs } from './FilterTabs';

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'due', label: 'Due', count: 2 },
  { id: 'taken', label: 'Taken' },
];

function Harness() {
  const [active, setActive] = useState('all');
  return (
    <div>
      <FilterTabs
        label="Filter medications"
        tabs={tabs}
        activeId={active}
        onChange={setActive}
        controls="med-list"
      />
      <div role="tabpanel" id="med-list" aria-label="Results">
        {active}
      </div>
    </div>
  );
}

describe('FilterTabs', () => {
  it('exposes tablist semantics with a single selected tab', () => {
    render(<Harness />);
    expect(screen.getByRole('tablist', { name: 'Filter medications' })).toBeInTheDocument();
    const all = screen.getByRole('tab', { name: /All/ });
    expect(all).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Due/ })).toHaveAttribute('aria-selected', 'false');
  });

  it('keeps only the active tab in the Tab order (roving tabindex)', () => {
    render(<Harness />);
    expect(screen.getByRole('tab', { name: /All/ })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: /Due/ })).toHaveAttribute('tabindex', '-1');
  });

  it('selects on click', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('tab', { name: /Taken/ }));
    expect(screen.getByRole('tab', { name: /Taken/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('taken');
  });

  it('moves selection and focus with ArrowRight/ArrowLeft and wraps', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const all = screen.getByRole('tab', { name: /All/ });
    all.focus();

    await user.keyboard('{ArrowRight}');
    const due = screen.getByRole('tab', { name: /Due/ });
    expect(due).toHaveFocus();
    expect(due).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowLeft}');
    expect(all).toHaveFocus();
    expect(all).toHaveAttribute('aria-selected', 'true');

    // Wrap backwards from the first tab to the last.
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: /Taken/ })).toHaveFocus();
  });

  it('jumps to first and last with Home and End', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    screen.getByRole('tab', { name: /All/ }).focus();

    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: /Taken/ })).toHaveFocus();

    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: /All/ })).toHaveFocus();
  });
});
