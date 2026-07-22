import { clockLabel } from '@/lib/format';
import type { Medication } from '@/models/types';
import { loadJSON, saveJSON } from './storage';

const STORAGE_KEY = 'medications';

/**
 * Stateless read/write access to the medication list. Each method re-reads
 * from localStorage (falling back to the seed), applies the mutation, and
 * persists — so a fresh repository instance always sees the saved state.
 */
export interface MedicationsRepository {
  load(): readonly Medication[];
  /** Flips status to `taken` and stamps `lastTakenAt = now`. Throws on unknown id. */
  markTaken(id: string): readonly Medication[];
  /** Flips status to `reminderSet` (snoozed for later). Throws on unknown id. */
  snooze(id: string): readonly Medication[];
  /** Appends a new medication. Throws if its id collides. */
  add(medication: Medication): readonly Medication[];
  /** Restore the demo seed. */
  reset(): readonly Medication[];
}

// Seed matches the desktop Figma (medications reference): a "Today" group of
// active meds plus one already-completed med, with detail-panel fields.
export function buildMedicationsSeed(): readonly Medication[] {
  return [
    {
      id: 'lisinopril-10mg',
      name: 'Lisinopril',
      dose: '10 mg',
      schedule: 'Once daily',
      timeLabel: '8:00 AM · Daily',
      instructions:
        'Take with water in the morning. Avoid skipping doses — contact ' +
        'Dr. Park before stopping.',
      status: 'dueSoon',
      lastTakenAt: null,
      category: 'Blood pressure',
      refill: '12 days left',
      adherence: '6 of 7',
      prescriber: 'Dr. Park',
    },
    {
      id: 'ibuprofen-400mg',
      name: 'Ibuprofen',
      dose: '400 mg',
      schedule: 'As needed',
      timeLabel: '1:00 PM · As needed',
      instructions: 'Take with food for wrist pain. Max 3 times per day.',
      status: 'reminderSet',
      lastTakenAt: null,
      category: 'Pain relief',
      refill: '20 days left',
      adherence: '4 of 7',
      prescriber: 'Dr. Park',
    },
    {
      id: 'vitamin-b6-50mg',
      name: 'Vitamin B6',
      dose: '50 mg',
      schedule: 'Once daily',
      timeLabel: '9:00 PM · Daily',
      instructions: 'Supports nerve health. Take with dinner.',
      status: 'scheduled',
      lastTakenAt: null,
      category: 'Supplement',
      refill: '35 days left',
      adherence: '7 of 7',
      prescriber: 'Nurse Lee',
    },
    {
      id: 'aspirin-81mg',
      name: 'Aspirin',
      dose: '81 mg',
      schedule: 'Once daily',
      timeLabel: 'Taken at 7:30 AM',
      instructions: 'Low-dose. Take with food to protect the stomach.',
      status: 'taken',
      lastTakenAt: Date.now(),
      takenAtLabel: '7:30 AM',
      category: 'Heart health',
      refill: '8 days left',
      adherence: '7 of 7',
      prescriber: 'Dr. Park',
    },
  ];
}

export function createMedicationsRepository(): MedicationsRepository {
  const read = (): readonly Medication[] => loadJSON(STORAGE_KEY, buildMedicationsSeed());
  const write = (medications: readonly Medication[]): readonly Medication[] => {
    saveJSON(STORAGE_KEY, medications);
    return medications;
  };

  const requireIndex = (medications: readonly Medication[], id: string): number => {
    const index = medications.findIndex((medication) => medication.id === id);
    if (index < 0) throw new Error(`No medication with id "${id}"`);
    return index;
  };

  return {
    load: () => read(),

    markTaken(id) {
      const medications = [...read()];
      const index = requireIndex(medications, id);
      const now = Date.now();
      const takenAtLabel = clockLabel(now);
      medications[index] = {
        ...medications[index],
        status: 'taken',
        lastTakenAt: now,
        takenAtLabel,
        timeLabel: `Taken at ${takenAtLabel}`,
      };
      return write(medications);
    },

    snooze(id) {
      const medications = [...read()];
      const index = requireIndex(medications, id);
      medications[index] = { ...medications[index], status: 'reminderSet' };
      return write(medications);
    },

    add(medication) {
      const medications = read();
      if (medications.some((existing) => existing.id === medication.id)) {
        throw new Error(`Medication with id "${medication.id}" already exists`);
      }
      return write([...medications, medication]);
    },

    reset: () => write(buildMedicationsSeed()),
  };
}
