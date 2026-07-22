import type { CareStatus } from '@/models/types';
import styles from './StatusBadge.module.css';

const LABELS: Record<CareStatus, string> = {
  taken: 'Taken',
  confirmed: 'Confirmed',
  reminderSet: 'Reminder set',
  dueSoon: 'Due soon',
  missed: 'Missed',
  scheduled: 'Scheduled',
};

/** Small status pill used by the Medications and Schedule pages. */
export function StatusBadge({ status }: { readonly status: CareStatus }) {
  return <span className={`${styles.badge} ${styles[status]}`}>{LABELS[status]}</span>;
}
