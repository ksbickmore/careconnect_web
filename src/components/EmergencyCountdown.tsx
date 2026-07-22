import { useEffect, useId, useRef, useState } from 'react';
import { PhoneCall, X } from 'lucide-react';
import { useAnnouncerStore } from '@/stores/announcer-store';
import styles from './EmergencyCountdown.module.css';

interface EmergencyCountdownProps {
  /** Who is being called, e.g. "911" or "Sarah (caregiver)". */
  readonly target: string;
  /** Seconds before the call is placed. */
  readonly seconds?: number;
  readonly onCancel: () => void;
  readonly onComplete: () => void;
}

/**
 * `role="alertdialog"` countdown shown after arming an emergency call.
 * Focus lands on the Cancel button; Escape or Cancel aborts. The remaining
 * time is announced assertively once on open (not every second, which would
 * drown a screen reader).
 */
export function EmergencyCountdown({
  target,
  seconds = 5,
  onCancel,
  onComplete,
}: EmergencyCountdownProps) {
  const [remaining, setRemaining] = useState(seconds);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const announce = useAnnouncerStore((state) => state.announce);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    announce(
      `Calling ${target} in ${seconds} seconds. Press Cancel or Escape to stop.`,
      'assertive',
    );
    return () => opener?.focus?.();
    // Announce exactly once, on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
      // Keep focus on Cancel: the alertdialog has a single control.
      if (e.key === 'Tab') e.preventDefault();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onCancel]);

  useEffect(() => {
    if (remaining <= 0) {
      onComplete();
      return;
    }
    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, onComplete]);

  return (
    <div className={styles.backdrop}>
      <div
        className={styles.panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <PhoneCall size={40} aria-hidden="true" className={styles.icon} />
        <h2 id={titleId} className={styles.title}>
          Calling {target}
        </h2>
        <p id={descId} className={styles.desc}>
          The call starts in <span className={styles.count}>{remaining}</span>{' '}
          {remaining === 1 ? 'second' : 'seconds'}. Cancel if this was a mistake.
        </p>
        <button
          ref={cancelRef}
          type="button"
          className={styles.cancel}
          onClick={onCancel}
        >
          <X size={24} aria-hidden="true" /> Cancel call
        </button>
      </div>
    </div>
  );
}
