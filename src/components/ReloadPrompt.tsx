import { RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
// Vite virtual module (mocked in Jest via moduleNameMapper) — keep this the
// only file that imports it so the mock boundary stays one module wide.
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useAnnouncerStore } from '@/stores/announcer-store';
import styles from './ReloadPrompt.module.css';

/**
 * Service-worker lifecycle UI: announces offline-readiness politely and shows
 * a visible "Update available" banner when a new deployment is waiting.
 */
export function ReloadPrompt() {
  const announce = useAnnouncerStore((state) => state.announce);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (offlineReady) {
      announce('CareConnect is ready to work offline.');
    }
  }, [offlineReady, announce]);

  if (!needRefresh) return null;

  return (
    <div className={styles.banner} role="status">
      <p>A new version of CareConnect is available.</p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.reload}
          onClick={() => void updateServiceWorker(true)}
        >
          <RefreshCw size={18} aria-hidden="true" /> Reload now
        </button>
        <button
          type="button"
          className={styles.dismiss}
          onClick={() => setNeedRefresh(false)}
        >
          Later
        </button>
      </div>
    </div>
  );
}
