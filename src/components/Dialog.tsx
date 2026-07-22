import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import styles from './Dialog.module.css';

interface DialogProps {
  readonly title: string;
  /** Optional sub-line under the title. */
  readonly description?: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  /** Optional footer actions row (buttons). */
  readonly footer?: ReactNode;
  /** Widen the panel for calendar/detail content. */
  readonly wide?: boolean;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Focus-trapped modal dialog. `role="dialog"` + `aria-modal`, Tab is trapped
 * inside, Escape closes, and focus returns to the element that opened it.
 * Used for every add-form and detail overlay.
 */
export function Dialog({
  title,
  description,
  onClose,
  children,
  footer,
  wide = false,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    // Focus the first focusable control inside the panel on open.
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const list = Array.from(nodes);
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey && activeEl === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && activeEl === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      // Restore focus to the trigger on close.
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    // Backdrop click-to-close is a mouse-only convenience; keyboard users
    // close with Escape (handled above), so no keyboard handler is needed.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className={styles.backdrop} onMouseDown={onClose}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- stops backdrop-close from swallowing clicks inside the panel */}
      <div
        ref={panelRef}
        className={`${styles.panel} ${wide ? styles.wide : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.head}>
          <div>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {description && (
              <p id={descId} className={styles.desc}>
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
