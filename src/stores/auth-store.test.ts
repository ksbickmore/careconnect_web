import { loadJSON } from '@/data/storage';
import { useAuthStore } from '@/stores/auth-store';

interface PersistedAuth {
  readonly signedIn: boolean;
  readonly email: string | null;
}

describe('auth-store persistence', () => {
  it('persists a successful sign-in so a page refresh stays signed in', () => {
    useAuthStore.getState().signIn('demo@careconnect.app', 'secret');
    expect(loadJSON<PersistedAuth | null>('auth', null)).toEqual({
      signedIn: true,
      email: 'demo@careconnect.app',
    });
  });

  it('persists guest sessions', () => {
    useAuthStore.getState().continueAsGuest();
    expect(loadJSON<PersistedAuth | null>('auth', null)).toEqual({
      signedIn: true,
      email: null,
    });
  });

  it('persists sign-out so a refresh does not resurrect the session', () => {
    useAuthStore.getState().signIn('demo@careconnect.app', 'secret');
    useAuthStore.getState().signOut();
    expect(loadJSON<PersistedAuth | null>('auth', null)).toEqual({
      signedIn: false,
      email: null,
    });
  });

  it('does not persist anything for a rejected sign-in', () => {
    useAuthStore.getState().signIn('', '');
    expect(loadJSON<PersistedAuth | null>('auth', null)).toBeNull();
  });

  it('hydrates from localStorage on module load (page refresh)', () => {
    localStorage.setItem(
      'careconnect:web:v1:auth',
      JSON.stringify({ signedIn: true, email: 'demo@careconnect.app' }),
    );
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fresh = require('@/stores/auth-store') as typeof import('@/stores/auth-store');
      expect(fresh.useAuthStore.getState().signedIn).toBe(true);
      expect(fresh.useAuthStore.getState().email).toBe('demo@careconnect.app');
    });
  });
});
