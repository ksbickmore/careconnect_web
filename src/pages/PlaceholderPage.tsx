import type { LucideIcon } from 'lucide-react';
import { usePageMeta } from '@/lib/use-page-meta';
import styles from './pages.module.css';

interface PlaceholderPageProps {
  readonly title: string;
  readonly description: string;
  readonly icon: LucideIcon;
}

export function PlaceholderPage({ title, description, icon: Icon }: PlaceholderPageProps) {
  usePageMeta({
    title,
    description: `Private CareConnect ${title.toLowerCase()} view.`,
    noIndex: true,
  });

  return (
    <div className={styles.placeholderPage}>
      <header role="group" aria-label={`${title} heading`}>
        <p className={styles.eyebrow}>CARECONNECT</p>
        <h1 tabIndex={-1}>{title}</h1>
      </header>
      <section className={styles.placeholderCard} aria-labelledby="placeholder-heading">
        <span className={styles.placeholderIcon} aria-hidden="true">
          <Icon size={34} />
        </span>
        <h2 id="placeholder-heading">Ready for the next milestone</h2>
        <p>{description}</p>
        <p>The route and responsive layout are in place; feature behavior will be ported next.</p>
      </section>
    </div>
  );
}
