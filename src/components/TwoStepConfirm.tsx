import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAnnouncerStore } from '@/stores/announcer-store';
import styles from './components.module.css';

interface TwoStepConfirmProps {
  readonly label: string;
  readonly itemName: string;
  readonly onConfirm: () => void;
}

export function TwoStepConfirm({ label, itemName, onConfirm }: TwoStepConfirmProps) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announce = useAnnouncerStore((state) => state.announce);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const activate = () => {
    if (!armed) {
      setArmed(true);
      announce(`${itemName} ready. Activate again within five seconds to confirm.`);
      timer.current = setTimeout(() => setArmed(false), 5000);
      return;
    }

    if (timer.current) clearTimeout(timer.current);
    setArmed(false);
    onConfirm();
  };

  return (
    <button
      type="button"
      className={`${styles.confirmButton} ${armed ? styles.confirmButtonArmed : ''}`}
      onClick={activate}
      aria-pressed={armed}
    >
      <Check size={20} aria-hidden="true" />
      {armed ? 'Tap again to confirm' : label}
    </button>
  );
}
