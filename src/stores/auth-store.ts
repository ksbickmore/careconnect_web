import { create } from 'zustand';
import { loadJSON, saveJSON } from '@/data/storage';

/**
 * Demo auth session. Persisted through the shared localStorage helpers like
 * the other stores so a page refresh keeps the user signed in; `signOut`
 * persists the cleared state so a refresh cannot resurrect the session.
 */
interface AuthState {
  readonly signedIn: boolean;
  readonly email: string | null;
}

interface AuthStore extends AuthState {
  signIn(email: string, password: string): boolean;
  continueAsGuest(): void;
  signOut(): void;
}

const DEFAULTS: AuthState = { signedIn: false, email: null };

export const useAuthStore = create<AuthStore>()((set) => {
  const persist = (state: AuthState) => {
    set(state);
    saveJSON('auth', state);
  };

  return {
    ...loadJSON<AuthState>('auth', DEFAULTS),
    signIn(email, password) {
      if (email.trim() === '' || password === '') return false;
      persist({ signedIn: true, email: email.trim() });
      return true;
    },
    continueAsGuest: () => persist({ signedIn: true, email: null }),
    signOut: () => persist(DEFAULTS),
  };
});
