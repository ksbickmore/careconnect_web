import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './PaginatedList.module.css';

interface PaginatedListProps<T> {
  readonly items: readonly T[];
  readonly renderItem: (item: T, index: number) => ReactNode;
  readonly keyOf: (item: T, index: number) => string;
  /** Items per page (no infinite scroll for CTS users — manual paging). */
  readonly pageSize?: number;
  readonly emptyMessage?: string;
}

/**
 * Manual Previous/Next pagination (no infinite scroll). Boundary buttons
 * disable at the ends; a "Page N of M" indicator is exposed politely.
 */
export function PaginatedList<T>({
  items,
  renderItem,
  keyOf,
  pageSize = 3,
  emptyMessage = 'Nothing to show yet.',
}: PaginatedListProps<T>) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const clamped = Math.min(page, pageCount - 1);
  const start = clamped * pageSize;
  const visible = items.slice(start, start + pageSize);

  if (items.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>;
  }

  return (
    <div className={styles.wrap}>
      <ul className={styles.list}>
        {visible.map((item, i) => (
          <li key={keyOf(item, start + i)}>{renderItem(item, start + i)}</li>
        ))}
      </ul>
      {pageCount > 1 && (
        <div className={styles.pager}>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setPage(clamped - 1)}
            disabled={clamped === 0}
            aria-label="Previous page"
          >
            <ChevronLeft size={18} aria-hidden="true" /> Previous
          </button>
          <span className={styles.indicator} aria-live="polite">
            Page {clamped + 1} of {pageCount}
          </span>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setPage(clamped + 1)}
            disabled={clamped >= pageCount - 1}
            aria-label="Next page"
          >
            Next <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
