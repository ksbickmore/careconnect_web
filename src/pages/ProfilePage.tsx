import { LogOut, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createContactsRepository } from '@/data/contacts-repository';
import { displayName } from '@/lib/format';
import { routes } from '@/lib/routes';
import { usePageMeta } from '@/lib/use-page-meta';
import { useAuthStore } from '@/stores/auth-store';
import styles from './feature-pages.module.css';

const contacts = createContactsRepository().getAll();

export function ProfilePage() {
  usePageMeta({
    title: 'Profile',
    description: 'Private CareConnect account and care-team overview.',
    noIndex: true,
  });
  const email = useAuthStore((state) => state.email);
  const signOut = useAuthStore((state) => state.signOut);
  const navigate = useNavigate();
  const prefix = email ? email.split('@')[0] : 'guest';
  const name = displayName(prefix);

  const leave = () => {
    signOut();
    void navigate(routes.login, { replace: true });
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader} role="group" aria-label="Profile heading">
        <div>
          <p className={styles.eyebrow}>CARECONNECT</p>
          <h1 tabIndex={-1}>Profile</h1>
          <p className={styles.pageSub}>Your account, care plan, and care team.</p>
        </div>
      </header>

      <section className={styles.card} aria-labelledby="account-heading">
        <h2 id="account-heading">Account</h2>
        <dl className={styles.detailList}>
          <div>
            <dt>Name</dt>
            <dd>{name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{email ?? 'Guest session (not signed in with an account)'}</dd>
          </div>
          <div>
            <dt>Care plan</dt>
            <dd>Severe CTS care plan</dd>
          </div>
        </dl>
      </section>

      <section className={styles.card} aria-labelledby="care-team-heading">
        <h2 id="care-team-heading">Care team</h2>
        <ul className={styles.contactList}>
          {contacts.map((contact) => (
            <li key={contact.name}>
              <span className={styles.avatar} aria-hidden="true">
                {contact.initials}
              </span>
              <span>
                <strong>{contact.name}</strong>
                <small>{contact.relationship}</small>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.card} aria-labelledby="preferences-heading">
        <h2 id="preferences-heading">Preferences</h2>
        <p className={styles.cardNote}>Adjust text size and reduce motion.</p>
        <Link to={routes.settings} className={styles.secondaryButton}>
          <Settings size={18} aria-hidden="true" /> Open settings
        </Link>
      </section>

      <section className={styles.card} aria-labelledby="session-heading">
        <h2 id="session-heading">Session</h2>
        <p className={styles.cardNote}>
          Signing out returns you to the login page. Your demo data stays on this device.
        </p>
        <button type="button" className={styles.secondaryButton} onClick={leave}>
          <LogOut size={18} aria-hidden="true" /> Sign out
        </button>
      </section>
    </div>
  );
}
