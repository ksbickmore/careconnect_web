import type { Conversation, Message } from '@/models/types';
import { loadJSON, saveJSON } from './storage';

const STORAGE_KEY = 'messages';

/**
 * Stateless access to care-team message threads (split-pane chat model,
 * ported from the desktop build). Persisted so sent replies survive a reload.
 */
export interface MessagesRepository {
  load(): readonly Conversation[];
  /** Append a message to a thread. Throws if the conversation is unknown. */
  appendMessage(conversationId: string, message: Message): readonly Conversation[];
  /** Mark a thread read (clears the unread dot). */
  markRead(conversationId: string): readonly Conversation[];
  /** Restore the demo seed. */
  reset(): readonly Conversation[];
}

// Seed threads mirror the Figma messages screen (Dr. Park unread, Nurse read).
export function buildConversationsSeed(): readonly Conversation[] {
  return [
    {
      id: 'dr-park',
      contactName: 'Dr. Park',
      initials: 'DP',
      subtitle: 'Primary physician',
      unread: true,
      messages: [
        { id: 'p1', fromMe: false, body: 'Reminder: Your PT session is tomorrow at 2:00 PM.', at: '8:02 AM' },
        { id: 'p2', fromMe: true, body: "Thanks! I'll be there.", at: '8:15 AM' },
        { id: 'p3', fromMe: false, body: 'Please bring your symptom log.', at: '8:16 AM' },
      ],
    },
    {
      id: 'nurse',
      contactName: 'Nurse',
      initials: 'N',
      subtitle: 'Clinic Nurse Desk',
      unread: false,
      messages: [
        { id: 'n1', fromMe: false, body: 'Great progress this week!', at: '2d' },
      ],
    },
  ];
}

export function createMessagesRepository(): MessagesRepository {
  const read = (): readonly Conversation[] => loadJSON(STORAGE_KEY, buildConversationsSeed());
  const write = (conversations: readonly Conversation[]): readonly Conversation[] => {
    saveJSON(STORAGE_KEY, conversations);
    return conversations;
  };

  const requireIndex = (conversations: readonly Conversation[], id: string): number => {
    const index = conversations.findIndex((conversation) => conversation.id === id);
    if (index < 0) throw new Error(`No conversation with id "${id}"`);
    return index;
  };

  return {
    load: () => read(),

    appendMessage(conversationId, message) {
      const conversations = [...read()];
      const index = requireIndex(conversations, conversationId);
      const conversation = conversations[index];
      conversations[index] = {
        ...conversation,
        messages: [...conversation.messages, message],
        // A message the user sends clears unread; an inbound one sets it.
        unread: !message.fromMe,
      };
      return write(conversations);
    },

    markRead(conversationId) {
      const conversations = [...read()];
      const index = requireIndex(conversations, conversationId);
      conversations[index] = { ...conversations[index], unread: false };
      return write(conversations);
    },

    reset: () => write(buildConversationsSeed()),
  };
}
