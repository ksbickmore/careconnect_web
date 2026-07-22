import { Download } from 'lucide-react';
import { useState } from 'react';
import { PaginatedList } from '@/components/PaginatedList';
import { StepControl } from '@/components/StepControl';
import { buildExportText } from '@/data/health-log-repository';
import { todayLabel } from '@/lib/format';
import { usePageMeta } from '@/lib/use-page-meta';
import { parseSpokenNumber } from '@/lib/voice/spoken-words';
import { useVoiceCommands } from '@/lib/voice/use-voice-commands';
import type { LogEntry } from '@/models/types';
import { useAnnouncerStore } from '@/stores/announcer-store';
import { useHealthLogStore } from '@/stores/health-log-store';
import styles from './feature-pages.module.css';

const MOODS = ['Good', 'OK', 'Low'] as const;

export function HealthLogPage() {
  usePageMeta({
    title: 'Health Log',
    description: 'Private CareConnect pain, sleep, and mood tracking.',
    noIndex: true,
  });
  const entries = useHealthLogStore((state) => state.entries);
  const addEntry = useHealthLogStore((state) => state.addEntry);
  const announce = useAnnouncerStore((state) => state.announce);

  const [painLevel, setPainLevel] = useState(5);
  const [sleepHours, setSleepHours] = useState(7);
  const [mood, setMood] = useState<(typeof MOODS)[number]>('OK');
  const [note, setNote] = useState('');

  const saveEntry = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addEntry({
      date: todayLabel(Date.now()),
      painLevel,
      sleepHours,
      mood,
      note: note.trim(),
    });
    setNote('');
    announce(`Health entry saved. Pain ${painLevel} out of 10, sleep ${sleepHours} hours.`);
  };

  useVoiceCommands('screen', [
    {
      phrases: ['pain up', 'increase pain'],
      hint: 'pain up',
      run: () => {
        const next = Math.min(10, painLevel + 1);
        setPainLevel(next);
        return `Pain level ${next} out of 10.`;
      },
    },
    {
      phrases: ['pain down', 'decrease pain'],
      hint: 'pain down',
      run: () => {
        const next = Math.max(0, painLevel - 1);
        setPainLevel(next);
        return `Pain level ${next} out of 10.`;
      },
    },
    {
      phrases: ['set pain to *', 'pain level *'],
      hint: 'set pain to <0-10>',
      run: (value = '') => {
        const level = parseSpokenNumber(value);
        if (level === null || level < 0 || level > 10) {
          return 'Say a pain level between 0 and 10.';
        }
        setPainLevel(level);
        return `Pain level ${level} out of 10.`;
      },
    },
    {
      phrases: ['sleep up', 'increase sleep'],
      hint: 'sleep up',
      run: () => {
        const next = Math.min(14, sleepHours + 0.5);
        setSleepHours(next);
        return `Sleep ${next} hours.`;
      },
    },
    {
      phrases: ['sleep down', 'decrease sleep'],
      hint: 'sleep down',
      run: () => {
        const next = Math.max(0, sleepHours - 0.5);
        setSleepHours(next);
        return `Sleep ${next} hours.`;
      },
    },
    {
      phrases: ['mood *'],
      hint: 'mood <good, ok, low>',
      run: (value = '') => {
        const spoken = value.toLowerCase();
        const target = MOODS.find((option) => spoken.includes(option.toLowerCase()));
        if (!target) return 'Say "mood" followed by good, OK, or low.';
        setMood(target);
        return `Mood set to ${target}.`;
      },
    },
    {
      phrases: ['save entry', 'save log'],
      hint: 'save entry',
      run: () => {
        document.querySelector<HTMLFormElement>('main form')?.requestSubmit();
      },
    },
  ]);

  const exportLog = () => {
    const blob = new Blob([buildExportText(entries)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'careconnect-health-log.txt';
    anchor.click();
    URL.revokeObjectURL(url);
    announce('Health log exported as a text file.');
  };

  const renderEntry = (entry: LogEntry) => (
    <article className={styles.historyEntry} aria-label={`Entry ${entry.date}`}>
      <header>
        <strong>{entry.date}</strong>
        {entry.mood && <span className={styles.moodChip}>{entry.mood}</span>}
      </header>
      <p className={styles.historyStats}>
        Pain {entry.painLevel}/10
        {entry.sleepHours != null && <> · Sleep {entry.sleepHours}h</>}
      </p>
      {entry.note && <p className={styles.historyNote}>{entry.note}</p>}
    </article>
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader} role="group" aria-label="Health log heading">
        <div>
          <p className={styles.eyebrow}>CARECONNECT</p>
          <h1 tabIndex={-1}>Health Log</h1>
          <p className={styles.pageSub}>
            Log how your hands feel with large step controls — no typing needed.
          </p>
        </div>
        <button type="button" className={styles.secondaryButton} onClick={exportLog}>
          <Download size={18} aria-hidden="true" /> Export log
        </button>
      </header>

      <div className={styles.splitLayout}>
        <section className={styles.card} aria-labelledby="new-entry-heading">
          <h2 id="new-entry-heading">New entry</h2>
          <form className={styles.formGrid} onSubmit={saveEntry}>
            <StepControl
              label="Pain level"
              value={painLevel}
              min={0}
              max={10}
              unit="/ 10"
              onIncrement={() => setPainLevel((value) => value + 1)}
              onDecrement={() => setPainLevel((value) => value - 1)}
            />
            <StepControl
              label="Sleep"
              value={sleepHours}
              min={0}
              max={14}
              unit="hrs"
              onIncrement={() => setSleepHours((value) => value + 0.5)}
              onDecrement={() => setSleepHours((value) => value - 0.5)}
            />

            <fieldset className={styles.fieldset}>
              <legend>Mood</legend>
              <div className={styles.chipRow}>
                {MOODS.map((option) => (
                  <label
                    key={option}
                    className={`${styles.chip} ${mood === option ? styles.chipActive : ''}`}
                  >
                    <input
                      type="radio"
                      name="mood"
                      className="visually-hidden"
                      checked={mood === option}
                      onChange={() => setMood(option)}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className={styles.field}>
              <label htmlFor="entry-note">Note (optional)</label>
              <textarea
                id="entry-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="e.g. Wrist pain after typing."
              />
            </div>

            <button type="submit" className={styles.primaryButton}>
              Save entry
            </button>
          </form>
        </section>

        <section className={styles.card} aria-labelledby="history-heading">
          <h2 id="history-heading">Recent entries</h2>
          <PaginatedList
            items={entries}
            pageSize={3}
            keyOf={(entry, index) => `${entry.date}-${index}`}
            renderItem={renderEntry}
            emptyMessage="No entries yet — save your first reading."
          />
        </section>
      </div>
    </div>
  );
}
