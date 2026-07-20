export type MedicationStatus = 'dueSoon' | 'scheduled' | 'taken';

export interface Medication {
  readonly id: string;
  readonly name: string;
  readonly dose: string;
  readonly timeLabel: string;
  readonly status: MedicationStatus;
  readonly lastTakenAt: number | null;
}

export interface Appointment {
  readonly id: string;
  readonly title: string;
  readonly when: number;
  readonly location: string;
}

export interface ConversationSummary {
  readonly id: string;
  readonly contactName: string;
  readonly preview: string;
  readonly unread: boolean;
}

export interface HealthSnapshot {
  readonly painLevel: number;
  readonly sleepHours: number;
  readonly lastLoggedLabel: string;
}

export interface DashboardData {
  readonly medications: readonly Medication[];
  readonly appointments: readonly Appointment[];
  readonly conversations: readonly ConversationSummary[];
  readonly health: HealthSnapshot;
}
