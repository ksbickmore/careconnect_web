import { create } from 'zustand';
import { loadJSON, saveJSON } from '@/data/storage';

/**
 * User preferences (Settings page). Persisted per-setter through the shared
 * localStorage helpers like the data repositories — no middleware. Applied to
 * the document by `useApplySettings` (mounted in AppShell).
 */
export type TextZoom = 1 | 1.15 | 1.3;

interface SettingsState {
  /** Whole-UI scale via body zoom; px-based tokens rule out font-size scaling. */
  readonly textZoom: TextZoom;
  readonly reducedMotion: boolean;
}

interface SettingsStore extends SettingsState {
  setTextZoom(zoom: TextZoom): void;
  setReducedMotion(on: boolean): void;
  /** Restore defaults without persisting — test isolation only. */
  reset(): void;
}

const DEFAULTS: SettingsState = {
  textZoom: 1,
  reducedMotion: false,
};

export const useSettingsStore = create<SettingsStore>()((set, get) => {
  const persist = (patch: Partial<SettingsState>) => {
    set(patch);
    const { textZoom, reducedMotion } = get();
    saveJSON('settings', { textZoom, reducedMotion });
  };

  return {
    ...loadJSON<SettingsState>('settings', DEFAULTS),
    setTextZoom: (textZoom) => persist({ textZoom }),
    setReducedMotion: (reducedMotion) => persist({ reducedMotion }),
    reset: () => set(DEFAULTS),
  };
});
