import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { useAuthStore } from '@/stores/auth-store';

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ signedIn: false, email: null });
});

afterEach(() => {
  cleanup();
});
