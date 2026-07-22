import { useRef, useState } from 'react';

/**
 * Roving-tabindex arrow-key navigation for vertical lists (medication list,
 * conversation list). Only one item is in the Tab order; ArrowUp/ArrowDown/
 * Home/End move focus between items.
 */
export function useArrowList(itemCount: number) {
  const [activeIndex, setActiveIndex] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);
  // Clamp when the list shrinks (e.g. a filter change).
  const clamped = Math.min(activeIndex, Math.max(0, itemCount - 1));

  const focusIndex = (index: number) => {
    const next = Math.max(0, Math.min(index, itemCount - 1));
    setActiveIndex(next);
    refs.current[next]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focusIndex(index + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusIndex(index - 1);
        break;
      case 'Home':
        e.preventDefault();
        focusIndex(0);
        break;
      case 'End':
        e.preventDefault();
        focusIndex(itemCount - 1);
        break;
      default:
    }
  };

  const getItemProps = (index: number) => ({
    ref: (node: HTMLElement | null) => {
      refs.current[index] = node;
    },
    tabIndex: index === clamped ? 0 : -1,
    onKeyDown: (e: React.KeyboardEvent) => onKeyDown(e, index),
    onFocus: () => setActiveIndex(index),
  });

  return { activeIndex: clamped, focusIndex, getItemProps };
}
