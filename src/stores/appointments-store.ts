import { create } from 'zustand';
import { createAppointmentsRepository } from '@/data/appointments-repository';
import type { Appointment } from '@/models/types';

const repository = createAppointmentsRepository();

interface AppointmentsStore {
  readonly appointments: readonly Appointment[];
  /** Throws on duplicate id so the add-form can surface an inline error. */
  add(appointment: Appointment): void;
  setReminder(id: string): void;
  /** Re-hydrate from storage (test isolation after localStorage.clear). */
  reload(): void;
  resetDemoData(): void;
}

export const useAppointmentsStore = create<AppointmentsStore>()((set) => ({
  appointments: repository.load(),
  add: (appointment) => set({ appointments: repository.add(appointment) }),
  setReminder: (id) => set({ appointments: repository.setReminder(id) }),
  reload: () => set({ appointments: repository.load() }),
  resetDemoData: () => set({ appointments: repository.reset() }),
}));
