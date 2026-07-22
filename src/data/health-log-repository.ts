import type { LogEntry } from '@/models/types';
import { loadJSON, saveJSON } from './storage';

const STORAGE_KEY = 'health-log';

/**
 * Stateless access to the health-log history (newest first). Also builds the
 * plain-text export used by the "Export log" download button.
 */
export interface HealthLogRepository {
  load(): readonly LogEntry[];
  /** Prepend a new entry (newest first) and persist. */
  append(entry: LogEntry): readonly LogEntry[];
  /** Restore the demo seed. */
  reset(): readonly LogEntry[];
}

// Seed rows mirror the Figma "Recent Entries" card so the Pain / Sleep / Mood
// chips render immediately without the user saving anything.
export function buildHealthLogSeed(): readonly LogEntry[] {
  return [
    { date: 'Wed, May 27', painLevel: 5, sleepHours: 7, mood: 'OK', note: 'Wrist pain after typing.' },
    { date: 'Tue, May 26', painLevel: 7, sleepHours: 5.5, mood: 'Low', note: 'Flare in late afternoon.' },
    { date: 'Mon, May 25', painLevel: 4, sleepHours: 8, mood: 'Good', note: 'Better after rest.' },
    { date: 'Sun, May 24', painLevel: 6, sleepHours: 6, mood: 'OK', note: 'Light activity.' },
    { date: 'Sat, May 23', painLevel: 3, sleepHours: 7.5, mood: 'Good', note: 'Mild tingling.' },
  ];
}

/** Plain-text export of the full history, newest first. */
export function buildExportText(entries: readonly LogEntry[]): string {
  const lines = entries.map((entry) => {
    const sleep = entry.sleepHours != null ? ` · Sleep ${entry.sleepHours}h` : '';
    const mood = entry.mood ? ` · Mood ${entry.mood}` : '';
    const note = entry.note ? ` — ${entry.note}` : '';
    return `${entry.date}: Pain ${entry.painLevel}/10${sleep}${mood}${note}`;
  });
  return ['CareConnect health log', '', ...lines, ''].join('\n');
}

export function createHealthLogRepository(): HealthLogRepository {
  const read = (): readonly LogEntry[] => loadJSON(STORAGE_KEY, buildHealthLogSeed());
  const write = (entries: readonly LogEntry[]): readonly LogEntry[] => {
    saveJSON(STORAGE_KEY, entries);
    return entries;
  };

  return {
    load: () => read(),
    append: (entry) => write([entry, ...read()]),
    reset: () => write(buildHealthLogSeed()),
  };
}
