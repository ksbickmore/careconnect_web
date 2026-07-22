import { useRef } from 'react';
import styles from './FilterTabs.module.css';

export interface FilterTab {
  readonly id: string;
  readonly label: string;
  /** Optional count badge, e.g. number of due medications. */
  readonly count?: number;
}

interface FilterTabsProps {
  /** Accessible name for the tablist, e.g. "Filter medications". */
  readonly label: string;
  readonly tabs: readonly FilterTab[];
  readonly activeId: string;
  readonly onChange: (id: string) => void;
  /** id of the element the tabs control (the filtered panel). */
  readonly controls: string;
}

/**
 * WAI-ARIA tablist used as a filter switcher (All/Due/Taken, Day/Week/Month).
 * Roving tabindex: only the active tab is in the Tab order; Left/Right/Home/End
 * move focus AND selection (automatic activation).
 */
export function FilterTabs({ label, tabs, activeId, onChange, controls }: FilterTabsProps) {
  const refs = useRef(new Map<string, HTMLButtonElement>());

  const move = (nextIndex: number) => {
    const clamped = (nextIndex + tabs.length) % tabs.length;
    const next = tabs[clamped];
    onChange(next.id);
    refs.current.get(next.id)?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        move(index + 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        move(index - 1);
        break;
      case 'Home':
        e.preventDefault();
        move(0);
        break;
      case 'End':
        e.preventDefault();
        move(tabs.length - 1);
        break;
      default:
    }
  };

  return (
    <div role="tablist" aria-label={label} className={styles.tablist}>
      {tabs.map((tab, index) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            ref={(node) => {
              if (node) refs.current.set(tab.id, node);
              else refs.current.delete(tab.id);
            }}
            type="button"
            role="tab"
            id={`tab-${controls}-${tab.id}`}
            aria-selected={active}
            aria-controls={controls}
            tabIndex={active ? 0 : -1}
            className={`${styles.tab} ${active ? styles.active : ''}`}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <span className={styles.count} aria-label={`, ${tab.count} items`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
