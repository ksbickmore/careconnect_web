import { PhoneCall, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { EmergencyCountdown } from '@/components/EmergencyCountdown';
import { TwoStepConfirm } from '@/components/TwoStepConfirm';
import { createContactsRepository } from '@/data/contacts-repository';
import { usePageMeta } from '@/lib/use-page-meta';
import { useAnnouncerStore } from '@/stores/announcer-store';
import styles from './feature-pages.module.css';

const contacts = createContactsRepository().getAll();
const caregiver = contacts[0];

export function EmergencyPage() {
  usePageMeta({
    title: 'Emergency',
    description: 'Private CareConnect emergency contacts with safeguards.',
    noIndex: true,
  });
  const announce = useAnnouncerStore((state) => state.announce);
  /** Who a countdown is running for, or null. */
  const [countdownFor, setCountdownFor] = useState<string | null>(null);
  /** Who a (simulated) call is connected to, or null. */
  const [connectedTo, setConnectedTo] = useState<string | null>(null);

  const cancelCountdown = () => {
    setCountdownFor(null);
    announce('Call cancelled.', 'assertive');
  };

  const completeCountdown = () => {
    if (countdownFor) {
      setConnectedTo(countdownFor);
      announce(`Connecting to ${countdownFor}.`, 'assertive');
    }
    setCountdownFor(null);
  };

  const endCall = () => {
    setConnectedTo(null);
    announce('Call ended.');
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader} role="group" aria-label="Emergency heading">
        <div>
          <p className={styles.eyebrow}>CARECONNECT</p>
          <h1 tabIndex={-1}>Emergency Help</h1>
          <p className={styles.pageSub}>
            Every call needs two activations, and a countdown you can cancel. Calls are
            simulated in this demo.
          </p>
        </div>
      </header>

      {connectedTo && (
        <section className={styles.connectedCard} role="status" aria-label="Call status">
          <PhoneCall size={28} aria-hidden="true" />
          <p>
            <strong>Connecting to {connectedTo}…</strong> (simulated)
          </p>
          <button type="button" className={styles.secondaryButton} onClick={endCall}>
            End call
          </button>
        </section>
      )}

      <div className={styles.sosGrid}>
        <section className={`${styles.sosCard} ${styles.sos911}`} aria-labelledby="sos-911">
          <ShieldAlert size={40} aria-hidden="true" />
          <h2 id="sos-911">Call 911</h2>
          <p>For life-threatening emergencies.</p>
          <TwoStepConfirm
            label="Call 911"
            itemName="Emergency call to 911"
            onConfirm={() => setCountdownFor('911')}
          />
        </section>

        <section className={styles.sosCard} aria-labelledby="sos-caregiver">
          <span className={`${styles.avatar} ${styles.avatarLarge}`} aria-hidden="true">
            {caregiver.initials}
          </span>
          <h2 id="sos-caregiver">Call {caregiver.name}</h2>
          <p>{caregiver.relationship}</p>
          <TwoStepConfirm
            label={`Call ${caregiver.name}`}
            itemName={`Call to ${caregiver.name}`}
            onConfirm={() => setCountdownFor(caregiver.name)}
          />
        </section>
      </div>

      <section className={styles.card} aria-labelledby="other-contacts-heading">
        <h2 id="other-contacts-heading">Other care-team contacts</h2>
        <ul className={styles.contactList}>
          {contacts.slice(1).map((contact) => (
            <li key={contact.name}>
              <span className={styles.avatar} aria-hidden="true">
                {contact.initials}
              </span>
              <span className={styles.listItemBody}>
                <strong>{contact.name}</strong>
                <small>{contact.relationship}</small>
              </span>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setCountdownFor(contact.name)}
              >
                <PhoneCall size={16} aria-hidden="true" /> Call
              </button>
            </li>
          ))}
        </ul>
      </section>

      {countdownFor && (
        <EmergencyCountdown
          target={countdownFor}
          seconds={5}
          onCancel={cancelCountdown}
          onComplete={completeCountdown}
        />
      )}
    </div>
  );
}
