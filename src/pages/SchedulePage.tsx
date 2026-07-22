import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Dialog } from '@/components/Dialog';
import { FilterTabs } from '@/components/FilterTabs';
import { StatusBadge } from '@/components/StatusBadge';
import { TwoStepConfirm } from '@/components/TwoStepConfirm';
import { clockLabel, minuteStamp, slugify, whenLabel } from '@/lib/format';
import { usePageMeta } from '@/lib/use-page-meta';
import { fillFieldById } from '@/lib/voice/dom-actions';
import {
  formatSpokenDate,
  formatSpokenTime,
  parseSpokenDate,
  parseSpokenTime,
} from '@/lib/voice/spoken-datetime';
import { useVoiceCommands } from '@/lib/voice/use-voice-commands';
import type { Appointment } from '@/models/types';
import { useAnnouncerStore } from '@/stores/announcer-store';
import { useAppointmentsStore } from '@/stores/appointments-store';
import styles from './feature-pages.module.css';

type View = 'day' | 'week' | 'month';

const VIEWS: readonly { id: View; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const startOfDay = (timestamp: number) => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const DAY_MS = 86_400_000;

const dateLabel = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

export function SchedulePage() {
  usePageMeta({
    title: 'Schedule',
    description: 'Private CareConnect appointment calendar.',
    noIndex: true,
  });
  const appointments = useAppointmentsStore((state) => state.appointments);
  const setReminder = useAppointmentsStore((state) => state.setReminder);
  const add = useAppointmentsStore((state) => state.add);
  const announce = useAnnouncerStore((state) => state.announce);

  const [view, setView] = useState<View>('week');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState('');

  // Captured once per mount so render stays pure (react-hooks/purity).
  const [now] = useState(() => new Date());
  const sorted = [...appointments].sort((a, b) => a.when - b.when);
  const todayStart = startOfDay(now.getTime());
  const selected = appointments.find((appointment) => appointment.id === selectedId) ?? null;

  const visible =
    view === 'day'
      ? sorted.filter(
          (appointment) =>
            appointment.when >= todayStart && appointment.when < todayStart + DAY_MS,
        )
      : view === 'week'
        ? sorted.filter(
            (appointment) =>
              appointment.when >= todayStart && appointment.when < todayStart + 7 * DAY_MS,
          )
        : sorted;

  const remind = (appointment: Appointment) => {
    setReminder(appointment.id);
    announce(`Reminder set for ${appointment.title}.`);
  };

  const submitAdd = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get('title') ?? '').trim();
    const clinician = String(data.get('clinician') ?? '').trim();
    const date = String(data.get('date') ?? '');
    const time = String(data.get('time') ?? '');
    const location = String(data.get('location') ?? '').trim();

    if (!title || !date || !time) {
      setAddError('Enter a title, date, and time.');
      return;
    }
    const when = new Date(`${date}T${time}`).getTime();
    if (Number.isNaN(when)) {
      setAddError('That date and time could not be understood.');
      return;
    }
    try {
      add({
        id: `${slugify(title)}-${minuteStamp(when)}`,
        title,
        clinician: clinician || 'Care team',
        when,
        location: location || 'To be confirmed',
        status: 'scheduled',
      });
      announce(`${title} added to your schedule for ${whenLabel(when)}.`);
      setAddError('');
      setAddOpen(false);
    } catch (error) {
      setAddError(error instanceof Error ? error.message : 'Could not add the appointment.');
    }
  };

  useVoiceCommands('screen', [
    ...VIEWS.map(({ id, label }) => ({
      phrases: [`${id} view`, `show ${id} view`],
      hint: `${id} view`,
      run: () => {
        setView(id);
        return `Showing the ${label.toLowerCase()} view.`;
      },
    })),
    {
      phrases: ['add appointment', 'new appointment'],
      hint: 'add appointment',
      run: () => {
        setAddError('');
        setAddOpen(true);
        return 'Opening the new appointment form.';
      },
    },
  ]);

  useVoiceCommands(
    'dialog',
    addOpen
      ? [
          {
            phrases: ['title *'],
            hint: 'title <appointment name>',
            run: (value = '') =>
              fillFieldById('appt-title', value)
                ? `Title set to ${value}.`
                : 'Could not find the title field.',
          },
          {
            phrases: ['date *'],
            hint: 'date <tomorrow, july 5, next friday>',
            run: (value = '') => {
              const iso = parseSpokenDate(value);
              if (!iso) return `Sorry, I did not understand the date "${value}".`;
              return fillFieldById('appt-date', iso)
                ? `Date set to ${formatSpokenDate(iso)}.`
                : 'Could not find the date field.';
            },
          },
          {
            phrases: ['time *'],
            hint: 'time <9 30 am, noon>',
            run: (value = '') => {
              const hhmm = parseSpokenTime(value);
              if (!hhmm) return `Sorry, I did not understand the time "${value}".`;
              return fillFieldById('appt-time', hhmm)
                ? `Time set to ${formatSpokenTime(hhmm)}.`
                : 'Could not find the time field.';
            },
          },
          {
            phrases: ['save', 'save appointment'],
            hint: 'save',
            run: () => {
              document
                .querySelector<HTMLFormElement>('[role="dialog"] form')
                ?.requestSubmit();
            },
          },
          {
            phrases: ['cancel', 'close dialog'],
            hint: 'cancel',
            run: () => {
              setAddOpen(false);
              return 'Closed without saving.';
            },
          },
        ]
      : [],
  );

  // Month grid for the current month: array of weeks, each 7 cells (or null).
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: first.getDay() }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  const appointmentsOn = (day: number) =>
    sorted.filter((appointment) => {
      const d = new Date(appointment.when);
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === day
      );
    });

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader} role="group" aria-label="Schedule heading">
        <div>
          <p className={styles.eyebrow}>CARECONNECT</p>
          <h1 tabIndex={-1}>Schedule</h1>
          <p className={styles.pageSub}>Appointments and care reminders, all in one place.</p>
        </div>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => {
            setAddError('');
            setAddOpen(true);
          }}
        >
          <Plus size={18} aria-hidden="true" /> New appointment
        </button>
      </header>

      <FilterTabs
        label="Calendar view"
        tabs={VIEWS}
        activeId={view}
        onChange={(id) => setView(id as View)}
        controls="schedule-panel"
      />

      <div id="schedule-panel" role="tabpanel" aria-labelledby={`tab-schedule-panel-${view}`}>
        {view !== 'month' && (
          <section
            aria-labelledby="upcoming-heading"
            className={styles.listSection}
          >
            <h2 id="upcoming-heading">
              {view === 'day' ? `Today — ${dateLabel(todayStart)}` : 'Next 7 days'}
            </h2>
            {visible.length === 0 ? (
              <p className={styles.emptyMessage}>
                Nothing scheduled {view === 'day' ? 'today' : 'this week'}.
              </p>
            ) : (
              <ul className={styles.itemList}>
                {visible.map((appointment) => (
                  <li key={appointment.id}>
                    <button
                      type="button"
                      className={styles.listItem}
                      onClick={() => setSelectedId(appointment.id)}
                    >
                      <span className={styles.listItemBody}>
                        <strong>{appointment.title}</strong>
                        <small>
                          {whenLabel(appointment.when)} · {appointment.location}
                        </small>
                      </span>
                      <StatusBadge status={appointment.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {view === 'month' && (
          <table className={styles.monthTable}>
            <caption>{monthName}</caption>
            <thead>
              <tr>
                {WEEKDAYS.map((day) => (
                  <th key={day} scope="col">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, weekIndex) => (
                <tr key={weekIndex}>
                  {week.map((day, dayIndex) => {
                    if (day == null) {
                      return <td key={dayIndex} className={styles.monthEmpty} />;
                    }
                    const todays = appointmentsOn(day);
                    const isToday =
                      day === now.getDate() ? styles.monthToday : '';
                    return (
                      <td key={dayIndex} className={isToday}>
                        <span className={styles.monthDay}>{day}</span>
                        {todays.map((appointment) => (
                          <button
                            key={appointment.id}
                            type="button"
                            className={styles.monthEvent}
                            onClick={() => setSelectedId(appointment.id)}
                          >
                            {clockLabel(appointment.when)} {appointment.title}
                          </button>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <Dialog
          title={selected.title}
          description={selected.clinician}
          onClose={() => setSelectedId(null)}
          footer={
            selected.status === 'reminderSet' ? (
              <p className={styles.detailDone}>A reminder is set for this appointment.</p>
            ) : (
              <TwoStepConfirm
                label="Set reminder"
                itemName={selected.title}
                onConfirm={() => remind(selected)}
              />
            )
          }
        >
          <dl className={styles.detailList}>
            <div>
              <dt>When</dt>
              <dd>
                {dateLabel(selected.when)} · {clockLabel(selected.when)}
              </dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{selected.location}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={selected.status} />
              </dd>
            </div>
          </dl>
        </Dialog>
      )}

      {addOpen && (
        <Dialog
          title="New appointment"
          description="Title, date, and time are required."
          onClose={() => setAddOpen(false)}
        >
          <form className={styles.formGrid} onSubmit={submitAdd} noValidate>
            {addError && (
              <p role="alert" className={styles.formError}>
                {addError}
              </p>
            )}
            <div className={styles.field}>
              <label htmlFor="appt-title">Title</label>
              <input id="appt-title" name="title" type="text" autoComplete="off" required />
            </div>
            <div className={styles.field}>
              <label htmlFor="appt-clinician">Clinician</label>
              <input id="appt-clinician" name="clinician" type="text" autoComplete="off" />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="appt-date">Date</label>
                <input id="appt-date" name="date" type="date" required />
              </div>
              <div className={styles.field}>
                <label htmlFor="appt-time">Time</label>
                <input id="appt-time" name="time" type="time" required />
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="appt-location">Location</label>
              <input id="appt-location" name="location" type="text" autoComplete="off" />
            </div>
            <button type="submit" className={styles.primaryButton}>
              Save appointment
            </button>
          </form>
        </Dialog>
      )}
    </div>
  );
}
