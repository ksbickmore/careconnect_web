import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { useAppointmentsStore } from '@/stores/appointments-store';
import { useAuthStore } from '@/stores/auth-store';
import { useHealthLogStore } from '@/stores/health-log-store';
import { useMedicationsStore } from '@/stores/medications-store';
import { useMessagesStore } from '@/stores/messages-store';
import { useSettingsStore } from '@/stores/settings-store';

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ signedIn: false, email: null });
  // Re-hydrate the entity stores from the (now empty) storage so every test
  // starts from the demo seed.
  useMedicationsStore.getState().reload();
  useAppointmentsStore.getState().reload();
  useHealthLogStore.getState().reload();
  useMessagesStore.getState().reload();
  useSettingsStore.getState().reset();
});

afterEach(() => {
  cleanup();
});
