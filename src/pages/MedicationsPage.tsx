import { AlarmClock, Plus } from 'lucide-react';
import { useState } from 'react';
import { Dialog } from '@/components/Dialog';
import { FilterTabs } from '@/components/FilterTabs';
import { StatusBadge } from '@/components/StatusBadge';
import { TwoStepConfirm } from '@/components/TwoStepConfirm';
import { slugify } from '@/lib/format';
import { useArrowList } from '@/lib/use-arrow-list';
import { usePageMeta } from '@/lib/use-page-meta';
import { fillFieldById, selectOptionById } from '@/lib/voice/dom-actions';
import { useVoiceCommands } from '@/lib/voice/use-voice-commands';
import type { Medication } from '@/models/types';
import { useAnnouncerStore } from '@/stores/announcer-store';
import { useMedicationsStore } from '@/stores/medications-store';
import styles from './feature-pages.module.css';

type Filter = 'all' | 'due' | 'taken';

const FILTERS: readonly { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'due', label: 'Due' },
  { id: 'taken', label: 'Taken' },
];


export function MedicationsPage() {
  usePageMeta({
    title: 'Medications',
    description: 'Private CareConnect medication list and dose logging.',
    noIndex: true,
  });
  const medications = useMedicationsStore((state) => state.medications);
  const markTaken = useMedicationsStore((state) => state.markTaken);
  const snooze = useMedicationsStore((state) => state.snooze);
  const add = useMedicationsStore((state) => state.add);
  const announce = useAnnouncerStore((state) => state.announce);

  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState('');

  const matches = (medication: Medication) =>
    filter === 'all' ||
    (filter === 'taken' ? medication.status === 'taken' : medication.status !== 'taken');
  const filtered = medications.filter(matches);
  const today = filtered.filter((medication) => medication.status !== 'taken');
  const completed = filtered.filter((medication) => medication.status === 'taken');
  // Arrow-key navigation walks the visible list in render order.
  const ordered = [...today, ...completed];
  const { getItemProps } = useArrowList(ordered.length);

  const selected = medications.find((medication) => medication.id === selectedId) ?? null;

  const confirmTaken = (medication: Medication) => {
    markTaken(medication.id);
    announce(`${medication.name} ${medication.dose} logged as taken.`);
  };

  const snoozeMedication = (medication: Medication) => {
    snooze(medication.id);
    announce(`${medication.name} snoozed. A reminder is set for later.`);
  };

  const moveSelection = (delta: number): string => {
    if (ordered.length === 0) return 'No medications in this list.';
    const index = ordered.findIndex((medication) => medication.id === selectedId);
    const nextIndex =
      index === -1
        ? delta > 0
          ? 0
          : ordered.length - 1
        : (index + delta + ordered.length) % ordered.length;
    const next = ordered[nextIndex];
    setSelectedId(next.id);
    return `${next.name} ${next.dose} selected.`;
  };

  useVoiceCommands('screen', [
    {
      phrases: ['next medication'],
      hint: 'next medication',
      run: () => moveSelection(1),
    },
    {
      phrases: ['previous medication'],
      hint: 'previous medication',
      run: () => moveSelection(-1),
    },
    {
      phrases: ['take medication', 'confirm taken'],
      hint: 'take medication',
      run: () => {
        if (!selected) return 'Select a medication first.';
        if (selected.status === 'taken') {
          return `${selected.name} is already logged as taken.`;
        }
        markTaken(selected.id);
        return `${selected.name} ${selected.dose} logged as taken.`;
      },
    },
    {
      phrases: ['snooze', 'snooze medication'],
      hint: 'snooze',
      run: () => {
        if (!selected || selected.status === 'taken') {
          return 'Select a due medication first.';
        }
        snooze(selected.id);
        return `${selected.name} snoozed. A reminder is set for later.`;
      },
    },
    {
      phrases: ['filter *'],
      hint: 'filter <all, due, taken>',
      run: (value) => {
        const spoken = (value ?? '').toLowerCase();
        const target = FILTERS.find((entry) => spoken.includes(entry.id));
        if (!target) return 'Say "filter" followed by all, due, or taken.';
        setFilter(target.id);
        return `Showing ${target.label.toLowerCase()} medications.`;
      },
    },
    {
      phrases: ['add medication', 'new medication'],
      hint: 'add medication',
      run: () => {
        setAddError('');
        setAddOpen(true);
        return 'Opening the add medication form.';
      },
    },
  ]);

  useVoiceCommands(
    'dialog',
    addOpen
      ? [
          {
            phrases: ['name *'],
            hint: 'name <medication>',
            run: (value = '') =>
              fillFieldById('med-name', value)
                ? `Name set to ${value}.`
                : 'Could not find the name field.',
          },
          {
            phrases: ['dose *'],
            hint: 'dose <amount>',
            run: (value = '') =>
              fillFieldById('med-dose', value)
                ? `Dose set to ${value}.`
                : 'Could not find the dose field.',
          },
          {
            phrases: ['schedule *'],
            hint: 'schedule <once daily, twice daily, as needed, nightly>',
            run: (value = '') => {
              const label = selectOptionById('med-schedule', value);
              return label
                ? `Schedule set to ${label}.`
                : 'Say "schedule" followed by once daily, twice daily, as needed, or nightly.';
            },
          },
          {
            phrases: ['time *', 'time label *'],
            hint: 'time <label, e.g. 8 am daily>',
            run: (value = '') =>
              fillFieldById('med-time', value)
                ? `Time label set to ${value}.`
                : 'Could not find the time field.',
          },
          {
            phrases: ['instructions *'],
            hint: 'instructions <text>',
            run: (value = '') =>
              fillFieldById('med-instructions', value)
                ? `Instructions set to ${value}.`
                : 'Could not find the instructions field.',
          },
          {
            phrases: ['save', 'save medication'],
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

  const submitAdd = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    const dose = String(data.get('dose') ?? '').trim();
    const schedule = String(data.get('schedule') ?? 'Once daily');
    const timeLabel = String(data.get('timeLabel') ?? '').trim() || 'Anytime';
    const instructions = String(data.get('instructions') ?? '').trim();

    if (!name || !dose) {
      setAddError('Enter both a medication name and a dose.');
      return;
    }
    try {
      add({
        id: slugify(`${name} ${dose}`),
        name,
        dose,
        schedule,
        timeLabel,
        instructions,
        status: 'scheduled',
        lastTakenAt: null,
      });
      announce(`${name} ${dose} added to your medications.`);
      setAddError('');
      setAddOpen(false);
    } catch (error) {
      setAddError(error instanceof Error ? error.message : 'Could not add the medication.');
    }
  };

  const renderItem = (medication: Medication, index: number) => (
    <li key={medication.id}>
      <button
        type="button"
        className={`${styles.listItem} ${selectedId === medication.id ? styles.listItemActive : ''}`}
        aria-pressed={selectedId === medication.id}
        onClick={() => setSelectedId(medication.id)}
        {...getItemProps(index)}
      >
        <span className={styles.listItemBody}>
          <strong>
            {medication.name} {medication.dose}
          </strong>
          <small>{medication.timeLabel}</small>
        </span>
        <StatusBadge status={medication.status} />
      </button>
    </li>
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader} role="group" aria-label="Medications heading">
        <div>
          <p className={styles.eyebrow}>CARECONNECT</p>
          <h1 tabIndex={-1}>Medications</h1>
          <p className={styles.pageSub}>
            {today.length === 0 && filter !== 'taken'
              ? 'Everything scheduled has been logged.'
              : 'Select a medication to review details and log a dose.'}
          </p>
        </div>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => {
            setAddError('');
            setAddOpen(true);
          }}
        >
          <Plus size={18} aria-hidden="true" /> Add medication
        </button>
      </header>

      <FilterTabs
        label="Filter medications"
        tabs={FILTERS.map((entry) => ({
          ...entry,
          count: medications.filter(
            (medication) =>
              entry.id === 'all' ||
              (entry.id === 'taken'
                ? medication.status === 'taken'
                : medication.status !== 'taken'),
          ).length,
        }))}
        activeId={filter}
        onChange={(id) => setFilter(id as Filter)}
        controls="medications-panel"
      />

      <div className={styles.splitLayout}>
        <div
          id="medications-panel"
          role="tabpanel"
          aria-labelledby={`tab-medications-panel-${filter}`}
        >
          {filtered.length === 0 && (
            <p className={styles.emptyMessage}>No medications match this filter.</p>
          )}

          {today.length > 0 && (
            <section aria-labelledby="today-heading" className={styles.listSection}>
              <h2 id="today-heading">Today</h2>
              <ul className={styles.itemList}>
                {today.map((medication, index) => renderItem(medication, index))}
              </ul>
            </section>
          )}

          {completed.length > 0 && (
            <section aria-labelledby="completed-heading" className={styles.listSection}>
              <h2 id="completed-heading">Completed</h2>
              <ul className={styles.itemList}>
                {completed.map((medication, index) =>
                  renderItem(medication, today.length + index),
                )}
              </ul>
            </section>
          )}
        </div>

        <aside className={styles.detailPanel} aria-label="Medication details">
          {selected ? (
            <>
              <div className={styles.detailHead}>
                <h2>
                  {selected.name} {selected.dose}
                </h2>
                <StatusBadge status={selected.status} />
              </div>
              <p className={styles.detailMeta}>
                {selected.category ? `${selected.category} · ` : ''}
                {selected.schedule} · {selected.timeLabel}
              </p>
              {selected.instructions && <p>{selected.instructions}</p>}
              <dl className={styles.detailList}>
                {selected.refill && (
                  <div>
                    <dt>Refill</dt>
                    <dd>{selected.refill}</dd>
                  </div>
                )}
                {selected.adherence && (
                  <div>
                    <dt>7-day adherence</dt>
                    <dd>{selected.adherence}</dd>
                  </div>
                )}
                {selected.prescriber && (
                  <div>
                    <dt>Prescriber</dt>
                    <dd>{selected.prescriber}</dd>
                  </div>
                )}
              </dl>
              {selected.status !== 'taken' ? (
                <div className={styles.detailActions}>
                  <TwoStepConfirm
                    label="Confirm taken"
                    itemName={`${selected.name} ${selected.dose}`}
                    onConfirm={() => confirmTaken(selected)}
                  />
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => snoozeMedication(selected)}
                  >
                    <AlarmClock size={18} aria-hidden="true" /> Snooze
                  </button>
                </div>
              ) : (
                <p className={styles.detailDone}>
                  Taken {selected.takenAtLabel ? `at ${selected.takenAtLabel}` : 'today'}.
                </p>
              )}
            </>
          ) : (
            <p className={styles.emptyMessage}>
              Select a medication from the list to see its details.
            </p>
          )}
        </aside>
      </div>

      {addOpen && (
        <Dialog
          title="Add medication"
          description="Only name and dose are required."
          onClose={() => setAddOpen(false)}
        >
          <form className={styles.formGrid} onSubmit={submitAdd} noValidate>
            {addError && (
              <p role="alert" className={styles.formError}>
                {addError}
              </p>
            )}
            <div className={styles.field}>
              <label htmlFor="med-name">Name</label>
              <input id="med-name" name="name" type="text" autoComplete="off" required />
            </div>
            <div className={styles.field}>
              <label htmlFor="med-dose">Dose</label>
              <input
                id="med-dose"
                name="dose"
                type="text"
                autoComplete="off"
                placeholder="e.g. 10 mg"
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="med-schedule">Schedule</label>
              <select id="med-schedule" name="schedule" defaultValue="Once daily">
                <option>Once daily</option>
                <option>Twice daily</option>
                <option>As needed</option>
                <option>Nightly</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="med-time">Time label</label>
              <input
                id="med-time"
                name="timeLabel"
                type="text"
                autoComplete="off"
                placeholder="e.g. 8:00 AM · Daily"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="med-instructions">Instructions</label>
              <textarea id="med-instructions" name="instructions" rows={3} />
            </div>
            <button type="submit" className={styles.primaryButton}>
              Save medication
            </button>
          </form>
        </Dialog>
      )}
    </div>
  );
}
