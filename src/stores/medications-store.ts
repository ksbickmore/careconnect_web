import { create } from 'zustand';
import { createMedicationsRepository } from '@/data/medications-repository';
import type { Medication } from '@/models/types';

const repository = createMedicationsRepository();

interface MedicationsStore {
  readonly medications: readonly Medication[];
  markTaken(id: string): void;
  snooze(id: string): void;
  /** Throws on duplicate id so the add-form can surface an inline error. */
  add(medication: Medication): void;
  /** Re-hydrate from storage (test isolation after localStorage.clear). */
  reload(): void;
  resetDemoData(): void;
}

export const useMedicationsStore = create<MedicationsStore>()((set) => ({
  medications: repository.load(),
  markTaken: (id) => set({ medications: repository.markTaken(id) }),
  snooze: (id) => set({ medications: repository.snooze(id) }),
  add: (medication) => set({ medications: repository.add(medication) }),
  reload: () => set({ medications: repository.load() }),
  resetDemoData: () => set({ medications: repository.reset() }),
}));
