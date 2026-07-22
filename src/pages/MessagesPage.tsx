import { ArrowLeft, SendHorizonal } from 'lucide-react';
import { useRef, useState } from 'react';
import { speechService } from '@/lib/speech/speech';
import { useArrowList } from '@/lib/use-arrow-list';
import { usePageMeta } from '@/lib/use-page-meta';
import { useVoiceCommands } from '@/lib/voice/use-voice-commands';
import { useAnnouncerStore } from '@/stores/announcer-store';
import { useMessagesStore } from '@/stores/messages-store';
import styles from './feature-pages.module.css';

export function MessagesPage() {
  usePageMeta({
    title: 'Messages',
    description: 'Private CareConnect care-team conversations.',
    noIndex: true,
  });
  const conversations = useMessagesStore((state) => state.conversations);
  const sendMessage = useMessagesStore((state) => state.sendMessage);
  const markRead = useMessagesStore((state) => state.markRead);
  const announce = useAnnouncerStore((state) => state.announce);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const threadHeadingRef = useRef<HTMLHeadingElement>(null);
  const listHeadingRef = useRef<HTMLHeadingElement>(null);
  const { getItemProps } = useArrowList(conversations.length);

  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? null;

  const openConversation = (id: string) => {
    setSelectedId(id);
    markRead(id);
    setDraft('');
    // Move focus into the thread pane (mobile drill-in and screen readers).
    requestAnimationFrame(() => threadHeadingRef.current?.focus());
  };

  const backToList = () => {
    setSelectedId(null);
    requestAnimationFrame(() => listHeadingRef.current?.focus());
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!selected || !body) return;
    sendMessage(selected.id, body);
    setDraft('');
    announce(`Message sent to ${selected.contactName}.`);
  };

  const moveConversation = (delta: number): string => {
    if (conversations.length === 0) return 'No conversations yet.';
    const index = conversations.findIndex(
      (conversation) => conversation.id === selectedId,
    );
    const nextIndex =
      index === -1
        ? delta > 0
          ? 0
          : conversations.length - 1
        : (index + delta + conversations.length) % conversations.length;
    const next = conversations[nextIndex];
    openConversation(next.id);
    return `Opened the conversation with ${next.contactName}.`;
  };

  useVoiceCommands('screen', [
    {
      phrases: ['next conversation'],
      hint: 'next conversation',
      run: () => moveConversation(1),
    },
    {
      phrases: ['previous conversation'],
      hint: 'previous conversation',
      run: () => moveConversation(-1),
    },
    {
      phrases: ['reply *'],
      hint: 'reply <your message>',
      run: (value = '') => {
        if (!selected) return 'Open a conversation first.';
        setDraft(value);
        return `Reply drafted: ${value}. Say "send" to send it.`;
      },
    },
    {
      phrases: ['send', 'send message'],
      hint: 'send',
      run: () => {
        const body = draft.trim();
        if (!selected) return 'Open a conversation first.';
        if (!body) return 'The reply is empty. Say "reply" followed by your message.';
        sendMessage(selected.id, body);
        setDraft('');
        return `Message sent to ${selected.contactName}.`;
      },
    },
    {
      phrases: ['read aloud', 'read message', 'read messages'],
      hint: 'read aloud',
      run: () => {
        if (!selected) return 'Open a conversation first.';
        if (!speechService.isSupported) {
          return 'Read aloud is not supported in this browser.';
        }
        const last = selected.messages.at(-1);
        if (!last) return 'There are no messages in this conversation.';
        speechService.speak(
          `${last.fromMe ? 'You wrote' : `${selected.contactName} wrote`}: ${last.body}`,
        );
        return `Reading the latest message from ${selected.contactName}.`;
      },
    },
    {
      phrases: ['back', 'all conversations'],
      hint: 'back',
      run: () => {
        if (!selected) return 'Already showing all conversations.';
        backToList();
        return 'Showing all conversations.';
      },
    },
  ]);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader} role="group" aria-label="Messages heading">
        <div>
          <p className={styles.eyebrow}>CARECONNECT</p>
          <h1 tabIndex={-1}>Messages</h1>
          <p className={styles.pageSub}>Stay in touch with your care team.</p>
        </div>
      </header>

      <div
        className={`${styles.messagesLayout} ${selected ? styles.threadOpen : ''}`}
      >
        <section className={styles.convoPane} aria-labelledby="conversations-heading">
          <h2 id="conversations-heading" ref={listHeadingRef} tabIndex={-1}>
            Conversations
          </h2>
          <ul className={styles.itemList}>
            {conversations.map((conversation, index) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  className={`${styles.listItem} ${
                    selectedId === conversation.id ? styles.listItemActive : ''
                  }`}
                  aria-pressed={selectedId === conversation.id}
                  onClick={() => openConversation(conversation.id)}
                  {...getItemProps(index)}
                >
                  <span className={styles.avatar} aria-hidden="true">
                    {conversation.initials}
                  </span>
                  <span className={styles.listItemBody}>
                    <strong>{conversation.contactName}</strong>
                    <small>{conversation.messages.at(-1)?.body}</small>
                  </span>
                  {conversation.unread && (
                    <span className={styles.unreadBadge}>Unread</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.threadPane} aria-labelledby="thread-heading">
          {selected ? (
            <article className={styles.thread}>
              <header className={styles.threadHead}>
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={backToList}
                >
                  <ArrowLeft size={18} aria-hidden="true" /> All conversations
                </button>
                <h2 id="thread-heading" ref={threadHeadingRef} tabIndex={-1}>
                  {selected.contactName}
                </h2>
                <p className={styles.pageSub}>{selected.subtitle}</p>
              </header>

              <ul className={styles.bubbleList} aria-label={`Messages with ${selected.contactName}`}>
                {selected.messages.map((message) => (
                  <li
                    key={message.id}
                    className={`${styles.bubble} ${message.fromMe ? styles.bubbleMine : ''}`}
                  >
                    <p>{message.body}</p>
                    <small>{message.fromMe ? `You · ${message.at}` : message.at}</small>
                  </li>
                ))}
              </ul>

              <form className={styles.composer} onSubmit={submit}>
                <label htmlFor="message-input" className="visually-hidden">
                  Message {selected.contactName}
                </label>
                <input
                  id="message-input"
                  type="text"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={`Message ${selected.contactName}…`}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={draft.trim().length === 0}
                >
                  <SendHorizonal size={18} aria-hidden="true" /> Send
                </button>
              </form>
            </article>
          ) : (
            <p className={styles.emptyMessage} id="thread-heading">
              Select a conversation to read and reply.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
