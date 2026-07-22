import { createMessagesRepository } from './messages-repository';

describe('messages repository', () => {
  it('loads the seed on first run', () => {
    const conversations = createMessagesRepository().load();
    expect(conversations).toHaveLength(2);
    expect(conversations[0]).toMatchObject({ id: 'dr-park', unread: true });
  });

  it('appends an outgoing message, clears unread, and persists', () => {
    createMessagesRepository().appendMessage('dr-park', {
      id: 'm1',
      fromMe: true,
      body: 'On my way.',
      at: '9:00 AM',
    });

    const reloaded = createMessagesRepository().load();
    const thread = reloaded.find((c) => c.id === 'dr-park');
    expect(thread?.messages.at(-1)).toMatchObject({ body: 'On my way.', fromMe: true });
    expect(thread?.unread).toBe(false);
  });

  it('sets unread when an inbound message arrives', () => {
    const updated = createMessagesRepository().appendMessage('nurse', {
      id: 'm2',
      fromMe: false,
      body: 'How are you today?',
      at: '9:05 AM',
    });
    expect(updated.find((c) => c.id === 'nurse')?.unread).toBe(true);
  });

  it('marks a thread read', () => {
    const updated = createMessagesRepository().markRead('dr-park');
    expect(updated.find((c) => c.id === 'dr-park')?.unread).toBe(false);
  });

  it('throws on unknown conversation ids', () => {
    const repository = createMessagesRepository();
    expect(() => repository.markRead('missing')).toThrow('No conversation with id "missing"');
    expect(() =>
      repository.appendMessage('missing', { id: 'x', fromMe: true, body: '', at: '' }),
    ).toThrow('No conversation with id "missing"');
  });

  it('reset restores the demo seed', () => {
    const repository = createMessagesRepository();
    repository.markRead('dr-park');
    repository.reset();
    expect(repository.load().find((c) => c.id === 'dr-park')?.unread).toBe(true);
  });
});
