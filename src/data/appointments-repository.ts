import type { Appointment } from '@/models/types';
import { loadJSON, saveJSON } from './storage';

const STORAGE_KEY = 'appointments';

/**
 * Stateless read/write access to scheduled appointments. Dates are computed
 * relative to load time so the demo list always reads as upcoming.
 */
export interface AppointmentsRepository {
  load(): readonly Appointment[];
  /** Appends a new appointment. Throws if its id collides. */
  add(appointment: Appointment): readonly Appointment[];
  /** Flips status to `reminderSet`. Throws on unknown id. */
  setReminder(id: string): readonly Appointment[];
  /** Restore the demo seed. */
  reset(): readonly Appointment[];
}

/** Today + `addDays` at `hour:minute`, seconds zeroed. */
function at(addDays: number, hour: number, minute: number): number {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + addDays,
    hour,
    minute,
  ).getTime();
}

export function buildAppointmentsSeed(): readonly Appointment[] {
  return [
    {
      id: 'physical-therapy',
      title: 'Physical Therapy',
      clinician: 'A. Rivera, PT',
      when: at(0, 14, 0),
      location: 'UMGC Medical',
      status: 'scheduled',
    },
    {
      id: 'nurse-check-in',
      title: 'Nurse check-in',
      clinician: 'Nurse Lee',
      when: at(2, 10, 30),
      location: 'Telehealth',
      status: 'scheduled',
    },
    {
      id: 'dr-park-follow-up',
      title: 'Dr. Park follow-up',
      clinician: 'Dr. Park',
      when: at(4, 14, 30),
      location: 'Riverside Clinic',
      status: 'reminderSet',
    },
  ];
}

export function createAppointmentsRepository(): AppointmentsRepository {
  const read = (): readonly Appointment[] => loadJSON(STORAGE_KEY, buildAppointmentsSeed());
  const write = (appointments: readonly Appointment[]): readonly Appointment[] => {
    saveJSON(STORAGE_KEY, appointments);
    return appointments;
  };

  return {
    load: () => read(),

    add(appointment) {
      const appointments = read();
      // Reject duplicates by id so the Add Appointment form can surface an
      // inline error rather than silently overwriting.
      if (appointments.some((existing) => existing.id === appointment.id)) {
        throw new Error(`Appointment with id "${appointment.id}" already exists`);
      }
      return write([...appointments, appointment]);
    },

    setReminder(id) {
      const appointments = [...read()];
      const index = appointments.findIndex((appointment) => appointment.id === id);
      if (index < 0) throw new Error(`No appointment with id "${id}"`);
      appointments[index] = { ...appointments[index], status: 'reminderSet' };
      return write(appointments);
    },

    reset: () => write(buildAppointmentsSeed()),
  };
}
