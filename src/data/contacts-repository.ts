import type { Contact } from '@/models/types';

/**
 * Read-only access to the user's care-team contacts. There is no add/edit
 * contact flow, so the list is the seed (or an injected test seed).
 */
export interface ContactsRepository {
  getAll(): readonly Contact[];
}

// First entry is treated as the primary caregiver by the Emergency page.
export const defaultContactsSeed: readonly Contact[] = [
  { name: 'Sarah Vance', relationship: 'Daughter · Caregiver', initials: 'SV' },
  { name: 'Dr. Park', relationship: 'Primary physician', initials: 'DP' },
  { name: 'Nurse', relationship: 'Clinic Nurse Desk', initials: 'N' },
  { name: 'Michael Kim', relationship: 'Son', initials: 'MK' },
];

export function createContactsRepository(
  seed: readonly Contact[] = defaultContactsSeed,
): ContactsRepository {
  const snapshot = Object.freeze([...seed]);
  return { getAll: () => snapshot };
}
