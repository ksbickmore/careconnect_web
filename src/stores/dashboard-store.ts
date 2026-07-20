import { create } from 'zustand';
import { createDashboardRepository } from '@/data/dashboard-repository';
import type { DashboardData } from '@/models/types';

const repository = createDashboardRepository();

interface DashboardStore extends DashboardData {
  markMedicationTaken(id: string): void;
  resetDemoData(): void;
}

export const useDashboardStore = create<DashboardStore>()((set) => ({
  ...repository.load(),
  markMedicationTaken: (id) => set(repository.markMedicationTaken(id)),
  resetDemoData: () => set(repository.reset()),
}));
