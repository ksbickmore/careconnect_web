import { Heart } from 'lucide-react';
import styles from './components.module.css';

export function Brand({ compact = false }: { readonly compact?: boolean }) {
  return (
    <span className={styles.brand} aria-label="CareConnect">
      <span className={styles.brandMark} aria-hidden="true">
        <Heart size={compact ? 20 : 24} strokeWidth={2.5} />
      </span>
      <span className={compact ? styles.brandTextCompact : styles.brandText}>
        CareConnect
      </span>
    </span>
  );
}
