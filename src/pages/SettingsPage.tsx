import { RotateCcw } from 'lucide-react';
import { usePageMeta } from '@/lib/use-page-meta';
import { useAnnouncerStore } from '@/stores/announcer-store';
import { useAppointmentsStore } from '@/stores/appointments-store';
import { useHealthLogStore } from '@/stores/health-log-store';
import { useMedicationsStore } from '@/stores/medications-store';
import { useMessagesStore } from '@/stores/messages-store';
import { useSettingsStore, type TextZoom } from '@/stores/settings-store';
import styles from './feature-pages.module.css';

const TEXT_SIZES: readonly { value: TextZoom; label: string; hint: string }[] = [
  { value: 1, label: 'Standard', hint: 'Default size' },
  { value: 1.15, label: 'Large', hint: '15% larger' },
  { value: 1.3, label: 'Extra large', hint: '30% larger' },
];

export function SettingsPage() {
  usePageMeta({
    title: 'Settings',
    description: 'Private CareConnect display and accessibility preferences.',
    noIndex: true,
  });
  const textZoom = useSettingsStore((state) => state.textZoom);
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const setTextZoom = useSettingsStore((state) => state.setTextZoom);
  const setReducedMotion = useSettingsStore((state) => state.setReducedMotion);
  const announce = useAnnouncerStore((state) => state.announce);
  const resetMedications = useMedicationsStore((state) => state.resetDemoData);
  const resetAppointments = useAppointmentsStore((state) => state.resetDemoData);
  const resetHealthLog = useHealthLogStore((state) => state.resetDemoData);
  const resetMessages = useMessagesStore((state) => state.resetDemoData);

  const chooseTextSize = (value: TextZoom, label: string) => {
    setTextZoom(value);
    announce(`Text size set to ${label}.`);
  };

  const toggleMotion = (on: boolean) => {
    setReducedMotion(on);
    announce(on ? 'Reduce motion turned on.' : 'Reduce motion turned off.');
  };

  const resetDemoData = () => {
    resetMedications();
    resetAppointments();
    resetHealthLog();
    resetMessages();
    announce('Demo data reset to the original examples.');
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader} role="group" aria-label="Settings heading">
        <div>
          <p className={styles.eyebrow}>CARECONNECT</p>
          <h1 tabIndex={-1}>Settings</h1>
          <p className={styles.pageSub}>
            Display preferences are saved on this device and apply everywhere.
          </p>
        </div>
      </header>

      <section className={styles.card} aria-labelledby="display-heading">
        <h2 id="display-heading">Display</h2>

        <fieldset className={styles.fieldset}>
          <legend>Text size</legend>
          {TEXT_SIZES.map(({ value, label, hint }) => (
            <label key={value} htmlFor={`text-size-${value}`} className={styles.radioRow}>
              <input
                id={`text-size-${value}`}
                type="radio"
                name="text-size"
                checked={textZoom === value}
                onChange={() => chooseTextSize(value, label)}
              />
              <span className={styles.optionText}>
                {label}
                <small>{hint}</small>
              </span>
            </label>
          ))}
        </fieldset>

        <label htmlFor="reduce-motion" className={styles.checkboxRow}>
          <input
            id="reduce-motion"
            type="checkbox"
            checked={reducedMotion}
            onChange={(event) => toggleMotion(event.target.checked)}
          />
          <span className={styles.optionText}>
            Reduce motion
            <small>Turns off animations and transitions.</small>
          </span>
        </label>
      </section>

      <section className={styles.card} aria-labelledby="data-heading">
        <h2 id="data-heading">Demo data</h2>
        <p className={styles.cardNote}>
          Medications, appointments, health entries, and messages are stored only in this
          browser. Resetting restores the original examples.
        </p>
        <button type="button" className={styles.secondaryButton} onClick={resetDemoData}>
          <RotateCcw size={18} aria-hidden="true" /> Reset demo data
        </button>
      </section>
    </div>
  );
}
