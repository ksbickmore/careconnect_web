import type { DashboardData, Medication } from '@/models/types';

const STORAGE_KEY = 'careconnect:web:v1:dashboard';

const atToday = (hour: number, minute: number) => {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.getTime();
};

export function buildDashboardSeed(): DashboardData {
  return {
    medications: [
      {
        id: 'lisinopril-10mg',
        name: 'Lisinopril',
        dose: '10 mg',
        timeLabel: '8:00 AM · Daily',
        status: 'dueSoon',
        lastTakenAt: null,
      },
      {
        id: 'ibuprofen-400mg',
        name: 'Ibuprofen',
        dose: '400 mg',
        timeLabel: '1:00 PM · As needed',
        status: 'scheduled',
        lastTakenAt: null,
      },
      {
        id: 'aspirin-81mg',
        name: 'Aspirin',
        dose: '81 mg',
        timeLabel: 'Taken at 7:30 AM',
        status: 'taken',
        lastTakenAt: atToday(7, 30),
      },
    ],
    appointments: [
      {
        id: 'physical-therapy',
        title: 'Physical Therapy',
        when: atToday(14, 0),
        location: 'UMGC Medical',
      },
      {
        id: 'vitamin-b6',
        title: 'Take Vitamin B6',
        when: atToday(21, 0),
        location: 'Daily medication',
      },
    ],
    conversations: [
      {
        id: 'dr-park',
        contactName: 'Dr. Park',
        preview: 'Please bring your symptom log.',
        unread: true,
      },
      {
        id: 'nurse',
        contactName: 'Nurse',
        preview: 'Great progress this week!',
        unread: false,
      },
    ],
    health: {
      painLevel: 6,
      sleepHours: 6.5,
      lastLoggedLabel: 'Yesterday',
    },
  };
}

export interface DashboardRepository {
  load(): DashboardData;
  markMedicationTaken(id: string): DashboardData;
  reset(): DashboardData;
}

const clone = (data: DashboardData): DashboardData => structuredClone(data);

export function createDashboardRepository(): DashboardRepository {
  const read = (): DashboardData => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as DashboardData) : buildDashboardSeed();
    } catch {
      return buildDashboardSeed();
    }
  };

  const write = (data: DashboardData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // The UI remains usable when storage is unavailable or full.
    }
    return clone(data);
  };

  return {
    load: () => clone(read()),
    markMedicationTaken(id) {
      const current = read();
      if (!current.medications.some((medication) => medication.id === id)) {
        throw new Error(`No medication with id "${id}"`);
      }
      const now = Date.now();
      const time = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(now);
      const medications: readonly Medication[] = current.medications.map((medication) =>
        medication.id === id
          ? {
              ...medication,
              status: 'taken',
              lastTakenAt: now,
              timeLabel: `Taken at ${time}`,
            }
          : medication,
      );
      return write({ ...current, medications });
    },
    reset() {
      const seed = buildDashboardSeed();
      return write(seed);
    },
  };
}
