import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAnnouncerStore } from '@/stores/announcer-store';
import styles from './OfflineBanner.module.css';

/**
 * Connectivity indicator. All CareConnect data lives on-device, so offline
 * use is fully supported — the banner just sets expectations.
 */
export function OfflineBanner() {
  const announce = useAnnouncerStore((state) => state.announce);
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const goOffline = () => {
      setOnline(false);
      announce("You're offline. Saved data is still available.");
    };
    const goOnline = () => {
      setOnline(true);
      announce("You're back online.");
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, [announce]);

  if (online) return null;

  return (
    <p className={styles.banner} role="status">
      <WifiOff size={16} aria-hidden="true" /> You're offline — showing saved data.
    </p>
  );
}
