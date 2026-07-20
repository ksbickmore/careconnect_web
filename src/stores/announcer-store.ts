import { create } from 'zustand';

interface AnnouncerStore {
  readonly polite: string;
  readonly assertive: string;
  readonly nonce: number;
  announce(message: string, priority?: 'polite' | 'assertive'): void;
}

export const useAnnouncerStore = create<AnnouncerStore>()((set) => ({
  polite: '',
  assertive: '',
  nonce: 0,
  announce(message, priority = 'polite') {
    set((state) => ({
      [priority]: message,
      nonce: state.nonce + 1,
    }));
  },
}));
