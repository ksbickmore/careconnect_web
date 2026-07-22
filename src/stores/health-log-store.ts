import { create } from 'zustand';
import { createHealthLogRepository } from '@/data/health-log-repository';
import type { LogEntry } from '@/models/types';

const repository = createHealthLogRepository();

interface HealthLogStore {
  /** History, newest first. */
  readonly entries: readonly LogEntry[];
  addEntry(entry: LogEntry): void;
  /** Re-hydrate from storage (test isolation after localStorage.clear). */
  reload(): void;
  resetDemoData(): void;
}

export const useHealthLogStore = create<HealthLogStore>()((set) => ({
  entries: repository.load(),
  addEntry: (entry) => set({ entries: repository.append(entry) }),
  reload: () => set({ entries: repository.load() }),
  resetDemoData: () => set({ entries: repository.reset() }),
}));
