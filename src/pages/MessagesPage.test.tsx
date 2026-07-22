import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MemoryRouter } from 'react-router-dom';
import { App } from '@/App';
import { routes } from '@/lib/routes';
import { useAuthStore } from '@/stores/auth-store';
import { useMessagesStore } from '@/stores/messages-store';

const renderMessages = () => {
  useAuthStore.setState({ signedIn: true, email: 'demo@careconnect.app' });
  return render(
    <MemoryRouter initialEntries={[routes.messages]}>
      <App />
    </MemoryRouter>,
  );
};

describe('MessagesPage', () => {
  it('lists conversations with the unread indicator', () => {
    renderMessages();
    const list = screen.getByRole('region', { name: 'Conversations' });
    const drPark = within(list).getByRole('button', { name: /Dr\. Park/ });
    expect(drPark).toHaveTextContent('Unread');
    expect(within(list).getByRole('button', { name: /Nurse/ })).toBeInTheDocument();
  });

  it('opens a thread, marks it read, and moves focus to the thread heading', async () => {
    const user = userEvent.setup();
    renderMessages();

    await user.click(screen.getByRole('button', { name: /Dr\. Park/ }));
    const thread = screen.getByRole('list', { name: 'Messages with Dr. Park' });
    expect(within(thread).getByText('Please bring your symptom log.')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 2, name: 'Dr. Park' })).toHaveFocus(),
    );
    expect(
      useMessagesStore.getState().conversations.find((c) => c.id === 'dr-park')?.unread,
    ).toBe(false);
  });

  it('sends a reply that appears as an outgoing bubble', async () => {
    const user = userEvent.setup();
    renderMessages();

    await user.click(screen.getByRole('button', { name: /Dr\. Park/ }));
    const input = screen.getByLabelText('Message Dr. Park');
    const send = screen.getByRole('button', { name: 'Send' });
    expect(send).toBeDisabled();

    await user.type(input, 'I will bring the log.');
    await user.click(send);

    const thread = screen.getByRole('list', { name: 'Messages with Dr. Park' });
    expect(within(thread).getByText('I will bring the log.')).toBeInTheDocument();
    expect(input).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('Message sent to Dr. Park.');
  });

  it('returns to the conversation list with the back button', async () => {
    const user = userEvent.setup();
    renderMessages();

    await user.click(screen.getByRole('button', { name: /Dr\. Park/ }));
    await user.click(screen.getByRole('button', { name: /All conversations/ }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 2, name: 'Conversations' })).toHaveFocus(),
    );
    expect(screen.getByText('Select a conversation to read and reply.')).toBeInTheDocument();
  });

  it('supports arrow-key navigation across the conversation list', async () => {
    const user = userEvent.setup();
    renderMessages();

    const drPark = screen.getByRole('button', { name: /Dr\. Park/ });
    drPark.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: /Nurse/ })).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(drPark).toHaveFocus();
  });

  it('has no automated axe violations with a thread open', async () => {
    const user = userEvent.setup();
    renderMessages();
    await user.click(screen.getByRole('button', { name: /Dr\. Park/ }));

    const result = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
