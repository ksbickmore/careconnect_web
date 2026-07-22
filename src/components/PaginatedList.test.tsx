import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaginatedList } from './PaginatedList';

const items = ['One', 'Two', 'Three', 'Four', 'Five'];

const renderList = (list: readonly string[] = items) =>
  render(
    <PaginatedList
      items={list}
      pageSize={2}
      keyOf={(item) => item}
      renderItem={(item) => <span>{item}</span>}
      emptyMessage="No entries yet."
    />,
  );

describe('PaginatedList', () => {
  it('shows the empty message when there are no items', () => {
    renderList([]);
    expect(screen.getByText('No entries yet.')).toBeInTheDocument();
  });

  it('renders only the current page and the page indicator', () => {
    renderList();
    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getByText('Two')).toBeInTheDocument();
    expect(screen.queryByText('Three')).not.toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('pages forward and back with boundary buttons disabled at the ends', async () => {
    const user = userEvent.setup();
    renderList();

    const prev = screen.getByRole('button', { name: 'Previous page' });
    const next = screen.getByRole('button', { name: 'Next page' });
    expect(prev).toBeDisabled();

    await user.click(next);
    expect(screen.getByText('Three')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    expect(prev).toBeEnabled();

    await user.click(next);
    expect(screen.getByText('Five')).toBeInTheDocument();
    expect(next).toBeDisabled();

    await user.click(prev);
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('hides the pager when everything fits on one page', () => {
    render(
      <PaginatedList
        items={['Solo']}
        keyOf={(item) => item}
        renderItem={(item) => <span>{item}</span>}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
  });
});
