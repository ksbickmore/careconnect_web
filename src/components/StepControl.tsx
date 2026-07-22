import { useEffect, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useAnnouncerStore } from '@/stores/announcer-store';
import styles from './StepControl.module.css';

interface StepControlProps {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  /** Unit suffix shown after the value, e.g. "/ 10" or "hrs". */
  readonly unit?: string;
  readonly onIncrement: () => void;
  readonly onDecrement: () => void;
}

/**
 * Large `[ − ]  value  [ + ]` stepper: replaces sliders and numeric typing,
 * which are barred for CTS users. Exposed as a `role="spinbutton"` with
 * aria-valuenow/min/max so screen readers announce the reading; each change
 * is also announced politely.
 */
export function StepControl({
  label,
  value,
  min,
  max,
  unit,
  onIncrement,
  onDecrement,
}: StepControlProps) {
  const announce = useAnnouncerStore((state) => state.announce);
  // Skip announcing the initial render; only speak on user-driven changes.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    announce(`${label}: ${value}${unit ? ` ${unit}` : ''}.`);
  }, [value, label, unit, announce]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (value < max) onIncrement();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      if (value > min) onDecrement();
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.label}>{label}</div>
      <div
        className={styles.row}
        role="spinbutton"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <button
          type="button"
          className={styles.step}
          onClick={onDecrement}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
        >
          <Minus size={24} aria-hidden="true" />
        </button>
        <div className={styles.value}>
          <span className={styles.num}>{value}</span>
          {unit && <span className={styles.unit}>{unit}</span>}
        </div>
        <button
          type="button"
          className={styles.step}
          onClick={onIncrement}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
        >
          <Plus size={24} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
