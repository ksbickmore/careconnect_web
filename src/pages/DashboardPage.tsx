import { ArrowRight, CalendarDays, HeartPulse, MessageSquare, Pencil, Pill } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TwoStepConfirm } from '@/components/TwoStepConfirm';
import { routes } from '@/lib/routes';
import { usePageMeta } from '@/lib/use-page-meta';
import { useAnnouncerStore } from '@/stores/announcer-store';
import { useAppointmentsStore } from '@/stores/appointments-store';
import { useAuthStore } from '@/stores/auth-store';
import { useHealthLogStore } from '@/stores/health-log-store';
import { useMedicationsStore } from '@/stores/medications-store';
import { useMessagesStore } from '@/stores/messages-store';
import styles from './pages.module.css';

const timeLabel = (timestamp: number) =>
  new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(timestamp);

export function DashboardPage() {
  usePageMeta({
    title: 'Dashboard',
    description: 'Private CareConnect daily medication and care summary.',
    noIndex: true,
  });
  const email = useAuthStore((state) => state.email);
  const medications = useMedicationsStore((state) => state.medications);
  const markMedicationTaken = useMedicationsStore((state) => state.markTaken);
  const allAppointments = useAppointmentsStore((state) => state.appointments);
  const conversations = useMessagesStore((state) => state.conversations);
  const entries = useHealthLogStore((state) => state.entries);
  const announce = useAnnouncerStore((state) => state.announce);

  // Derived dashboard summaries (single source of truth: the entity stores).
  const appointments = [...allAppointments].sort((a, b) => a.when - b.when).slice(0, 2);
  const latestEntry = entries[0];
  const health = {
    painLevel: latestEntry?.painLevel ?? 0,
    sleepHours: latestEntry?.sleepHours ?? 0,
    lastLoggedLabel: latestEntry?.date ?? 'Not yet',
  };
  const takenCount = medications.filter((medication) => medication.status === 'taken').length;
  const nextMedication =
    medications.find((medication) => medication.status === 'dueSoon') ??
    medications.find((medication) => medication.status !== 'taken');
  const name = email ? email.split('@')[0] : 'Sung';
  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const confirmMedication = () => {
    if (!nextMedication) return;
    markMedicationTaken(nextMedication.id);
    announce(`${nextMedication.name} ${nextMedication.dose} logged as taken.`);
  };

  return (
    <div className={styles.dashboardPage}>
      <header className={styles.dashboardHeader} role="group" aria-label="Dashboard heading">
        <div>
          <p className={styles.eyebrow}>YOUR DAILY OVERVIEW</p>
          <h1 tabIndex={-1}>Good morning, {name}</h1>
          <p>
            {today} · {takenCount} of {medications.length} medications taken today
          </p>
        </div>
        <Link className={styles.headerAction} to={routes.medications}>
          <Pill size={19} aria-hidden="true" /> View medications
        </Link>
      </header>

      <section className={styles.statsSection} aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="visually-hidden">
          Today's health summary
        </h2>
        <dl className={styles.statsGrid}>
          <div className={styles.statCard}>
            <dt>PAIN LEVEL</dt>
            <dd className={styles.statAmber}>
              <strong>{health.painLevel}/10</strong>
              <small>From {health.lastLoggedLabel.toLowerCase()}</small>
            </dd>
          </div>
          <div className={styles.statCard}>
            <dt>MEDS TODAY</dt>
            <dd className={styles.statTeal}>
              <strong>
                {takenCount}/{medications.length}
              </strong>
              <small>{medications.length - takenCount} remaining</small>
            </dd>
          </div>
          <div className={styles.statCard}>
            <dt>SLEEP</dt>
            <dd>
              <strong>{health.sleepHours}h</strong>
              <small>Goal: 8h</small>
            </dd>
          </div>
        </dl>
      </section>

      <section className={styles.dashboardGrid} aria-label="Today's care details">
        <article className={`${styles.dashboardCard} ${styles.medicationCard}`}>
          <div className={styles.cardHeadingRow}>
            <span className={styles.cardIcon} aria-hidden="true">
              <Pill size={22} />
            </span>
            <p className={styles.cardEyebrow}>NEXT MEDICATION</p>
            {nextMedication && <span className={styles.dueBadge}>DUE</span>}
          </div>
          {nextMedication ? (
            <>
              <h2>
                {nextMedication.name} {nextMedication.dose}
              </h2>
              <p>{nextMedication.timeLabel}</p>
              <TwoStepConfirm
                label="Confirm taken"
                itemName={`${nextMedication.name} ${nextMedication.dose}`}
                onConfirm={confirmMedication}
              />
            </>
          ) : (
            <>
              <h2>All medications complete</h2>
              <p>Everything scheduled for today has been logged.</p>
            </>
          )}
        </article>

        <article className={`${styles.dashboardCard} ${styles.symptomCard}`}>
          <div className={styles.cardHeadingRow}>
            <span className={`${styles.cardIcon} ${styles.cardIconAmber}`} aria-hidden="true">
              <HeartPulse size={22} />
            </span>
            <p className={styles.cardEyebrow}>TODAY'S SYMPTOMS</p>
          </div>
          <h2>How are your hands feeling?</h2>
          <p>Last logged: {health.lastLoggedLabel}</p>
          <Link className={styles.secondaryAction} to={routes.healthLog}>
            <Pencil size={18} aria-hidden="true" /> Log symptoms
          </Link>
        </article>

        <article className={styles.dashboardCard}>
          <div className={styles.cardTitleRow}>
            <h2>
              <CalendarDays size={21} aria-hidden="true" /> Today's schedule
            </h2>
            <Link to={routes.schedule}>
              See all <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <ul className={styles.summaryList}>
            {appointments.map((appointment, index) => (
              <li key={appointment.id}>
                <span>
                  <strong>{appointment.title}</strong>
                  <small>
                    {timeLabel(appointment.when)} · {appointment.location}
                  </small>
                </span>
                <span className={index === 0 ? styles.soonBadge : styles.laterBadge}>
                  {index === 0 ? 'SOON' : 'LATER'}
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className={styles.dashboardCard}>
          <div className={styles.cardTitleRow}>
            <h2>
              <MessageSquare size={21} aria-hidden="true" /> Messages
            </h2>
            <Link to={routes.messages}>
              Open <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <ul className={styles.summaryList}>
            {conversations.map((conversation) => (
              <li key={conversation.id} className={conversation.unread ? styles.unreadRow : ''}>
                <span>
                  <strong>{conversation.contactName}</strong>
                  <small>{conversation.messages.at(-1)?.body}</small>
                </span>
                {conversation.unread && <span className={styles.unreadDot}>Unread</span>}
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
