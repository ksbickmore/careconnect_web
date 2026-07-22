/**
 * Plain data models shared between pages, repositories, and stores.
 * Ported from the desktop app's `src/models/types.ts` (the superset model).
 * No seed data lives here — see `src/data/` for that.
 */

/** Care-flow status used by medications and appointments. */
export type CareStatus =
  | 'taken'
  | 'confirmed'
  | 'reminderSet'
  | 'dueSoon'
  | 'missed'
  | 'scheduled';

export interface Medication {
  readonly id: string;
  readonly name: string;
  readonly dose: string;
  readonly schedule: string;
  readonly instructions: string;
  readonly status: CareStatus;
  /** Short due/time label for the list pill, e.g. "8:00 AM · Daily". */
  readonly timeLabel: string;
  /**
   * When the user last marked this medication as taken (ms since epoch).
   * `null` means it has never been logged. Set by `markTaken`.
   */
  readonly lastTakenAt: number | null;

  // --- Detail-panel fields (optional) ---
  /** e.g. "Blood pressure" — shown next to the schedule in the detail header. */
  readonly category?: string;
  /** Refill countdown, e.g. "12 days left". */
  readonly refill?: string;
  /** 7-day adherence summary, e.g. "6 of 7". */
  readonly adherence?: string;
  /** Prescribing clinician, e.g. "Dr. Park". */
  readonly prescriber?: string;
  /** Human label for when a completed med was taken, e.g. "7:30 AM". */
  readonly takenAtLabel?: string;
}

export interface Appointment {
  readonly id: string;
  readonly title: string;
  readonly clinician: string;
  /** The appointment's scheduled date + time (ms since epoch). */
  readonly when: number;
  readonly location: string;
  readonly status: CareStatus;
}

/** Care-team contact. First contact is treated as the primary caregiver. */
export interface Contact {
  readonly name: string;
  readonly relationship: string;
  readonly initials: string;
}

/** One saved health-log reading. */
export interface LogEntry {
  /** Display label, e.g. "Today 14:32" or "Mon, May 25". */
  readonly date: string;
  readonly painLevel: number;
  /** Sleep hours captured with the entry, if any. */
  readonly sleepHours?: number;
  /** Mood label captured with the entry, if any (e.g. "OK", "Good"). */
  readonly mood?: string;
  readonly note: string;
}

/** A single message inside a conversation thread. */
export interface Message {
  readonly id: string;
  /** True when the signed-in user sent it (right-aligned bubble). */
  readonly fromMe: boolean;
  readonly body: string;
  /** Human label for the bubble timestamp, e.g. "8:15 AM". */
  readonly at: string;
}

/** A care-team message thread shown in the Messages master-detail. */
export interface Conversation {
  readonly id: string;
  readonly contactName: string;
  readonly initials: string;
  /** Role/subtitle shown under the name, e.g. "Primary physician". */
  readonly subtitle: string;
  readonly messages: readonly Message[];
  readonly unread: boolean;
}
