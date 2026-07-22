import {
  CalendarDays,
  HeartPulse,
  House,
  LogOut,
  MessageSquare,
  Pill,
  Settings,
  TriangleAlert,
  UserRound,
} from 'lucide-react';
import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Brand } from '@/components/Brand';
import { LiveRegions } from '@/components/LiveRegions';
import { OfflineBanner } from '@/components/OfflineBanner';
import { VoiceInputBar } from '@/components/VoiceInputBar';
import { routes } from '@/lib/routes';
import { useApplySettings } from '@/lib/use-apply-settings';
import { useAuthStore } from '@/stores/auth-store';
import { useMedicationsStore } from '@/stores/medications-store';
import { useMessagesStore } from '@/stores/messages-store';
import styles from './AppShell.module.css';

const primaryItems = [
  { label: 'Dashboard', mobileLabel: 'Home', to: routes.dashboard, icon: House },
  { label: 'Medications', mobileLabel: 'Meds', to: routes.medications, icon: Pill },
  { label: 'Schedule', mobileLabel: 'Schedule', to: routes.schedule, icon: CalendarDays },
  { label: 'Messages', mobileLabel: 'Messages', to: routes.messages, icon: MessageSquare },
  { label: 'Health Log', mobileLabel: 'Health', to: routes.healthLog, icon: HeartPulse },
] as const;

export function AppShell() {
  useApplySettings();
  const location = useLocation();
  const navigate = useNavigate();
  const email = useAuthStore((state) => state.email);
  const signOut = useAuthStore((state) => state.signOut);
  const medications = useMedicationsStore((state) => state.medications);
  const conversations = useMessagesStore((state) => state.conversations);
  const remaining = medications.filter((medication) => medication.status !== 'taken').length;
  const unread = conversations.filter((conversation) => conversation.unread).length;
  const userName = email ? email.split('@')[0] : 'Guest';

  useEffect(() => {
    const heading = document.querySelector<HTMLElement>('main h1');
    heading?.focus();
  }, [location.pathname]);

  // Ctrl+Space toggles the voice command mic from anywhere, including while
  // typing in a field (documented global shortcut).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.code === 'Space') {
        event.preventDefault();
        document.getElementById('voice-command-mic')?.click();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const leave = () => {
    signOut();
    void navigate(routes.login, { replace: true });
  };

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">
        Skip to main content
      </a>
      <div className={styles.offlineArea}>
        <OfflineBanner />
      </div>

      <header className={styles.banner}>
        <NavLink to={routes.dashboard} className={styles.brandLink}>
          <Brand compact />
        </NavLink>
        <div className={styles.account}>
          <NavLink
            to={routes.profile}
            className={styles.accountName}
            aria-label={`Profile: ${userName}`}
          >
            <UserRound size={18} aria-hidden="true" />
            <span>{userName}</span>
          </NavLink>
          <button type="button" className={styles.signOut} onClick={leave}>
            <LogOut size={18} aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </header>

      <aside className={styles.sidebar} aria-label="CareConnect navigation panel">
        <NavLink to={routes.profile} className={styles.profileCard}>
          <span className={styles.avatar} aria-hidden="true">
            {userName.slice(0, 2).toUpperCase()}
          </span>
          <span>
            <strong>{userName}</strong>
            <small>SEVERE CTS CARE PLAN</small>
          </span>
        </NavLink>

        <nav className={styles.primaryNav} aria-label="Primary">
          <span className={styles.navGroup} aria-hidden="true">
            CARE
          </span>
          {primaryItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
            >
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
              {to === routes.medications && remaining > 0 && (
                <span className={styles.badge} aria-label={`${remaining} medications remaining`}>
                  {remaining}
                </span>
              )}
              {to === routes.messages && unread > 0 && (
                <span className={styles.badge} aria-label={`${unread} unread conversation`}>
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <nav className={styles.utilityNav} aria-label="Account and safety">
          <NavLink to={routes.settings} className={styles.utilityLink}>
            <Settings size={19} aria-hidden="true" />
            Settings
          </NavLink>
          <NavLink to={routes.emergency} className={styles.emergencyLink}>
            <TriangleAlert size={20} aria-hidden="true" />
            Emergency (SOS)
          </NavLink>
        </nav>
      </aside>

      <main id="main-content" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>

      <section className={styles.voiceArea} aria-label="Voice commands">
        <VoiceInputBar />
      </section>

      <nav className={styles.bottomNav} aria-label="Primary mobile">
        {primaryItems.map(({ mobileLabel, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.bottomItem} ${isActive ? styles.bottomItemActive : ''}`
            }
          >
            <Icon size={21} aria-hidden="true" />
            <span>{mobileLabel}</span>
          </NavLink>
        ))}
        <NavLink
          to={routes.emergency}
          className={({ isActive }) =>
            `${styles.bottomItem} ${styles.bottomEmergency} ${isActive ? styles.bottomEmergencyActive : ''}`
          }
        >
          <TriangleAlert size={22} aria-hidden="true" />
          <span>SOS</span>
        </NavLink>
      </nav>
      <LiveRegions />
    </div>
  );
}
