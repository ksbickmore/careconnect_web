import { create } from 'zustand';
import { clockLabel } from '@/lib/format';
import { createMessagesRepository } from '@/data/messages-repository';
import type { Conversation } from '@/models/types';

const repository = createMessagesRepository();

interface MessagesStore {
  readonly conversations: readonly Conversation[];
  /** Append an outgoing message (fromMe) to the given thread. */
  sendMessage(conversationId: string, body: string): void;
  markRead(conversationId: string): void;
  /** Re-hydrate from storage (test isolation after localStorage.clear). */
  reload(): void;
  resetDemoData(): void;
}

export const useMessagesStore = create<MessagesStore>()((set) => ({
  conversations: repository.load(),
  sendMessage: (conversationId, body) => {
    const now = Date.now();
    set({
      conversations: repository.appendMessage(conversationId, {
        id: `m-${now}`,
        fromMe: true,
        body,
        at: clockLabel(now),
      }),
    });
  },
  markRead: (conversationId) =>
    set({ conversations: repository.markRead(conversationId) }),
  reload: () => set({ conversations: repository.load() }),
  resetDemoData: () => set({ conversations: repository.reset() }),
}));
