import { create } from 'zustand';

interface AuthStore {
  readonly signedIn: boolean;
  readonly email: string | null;
  signIn(email: string, password: string): boolean;
  continueAsGuest(): void;
  signOut(): void;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  signedIn: false,
  email: null,
  signIn(email, password) {
    if (email.trim() === '' || password === '') return false;
    set({ signedIn: true, email: email.trim() });
    return true;
  },
  continueAsGuest: () => set({ signedIn: true, email: null }),
  signOut: () => set({ signedIn: false, email: null }),
}));
