import { Link } from 'react-router-dom';
import { routes } from '@/lib/routes';
import { usePageMeta } from '@/lib/use-page-meta';
import styles from './pages.module.css';

export function NotFoundPage() {
  usePageMeta({
    title: 'Page Not Found',
    description: 'The requested CareConnect page could not be found.',
    noIndex: true,
  });

  return (
    <main className={styles.notFound}>
      <p className={styles.eyebrow}>404</p>
      <h1>We couldn't find that page.</h1>
      <p>Return to the CareConnect home page and try again.</p>
      <Link className={styles.primaryCta} to={routes.landing}>
        Go to home
      </Link>
    </main>
  );
}
