import { ArrowRight, Mic, Pill, ShieldPlus, Touchpad } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Brand } from '@/components/Brand';
import { routes } from '@/lib/routes';
import { usePageMeta } from '@/lib/use-page-meta';
import styles from './pages.module.css';

const features = [
  {
    icon: Mic,
    title: 'Voice-ready care',
    description: 'The web foundation is prepared for future voice commands and dictation.',
  },
  {
    icon: Touchpad,
    title: 'Made for tender hands',
    description: 'Large controls, generous spacing, and keyboard access reduce precise movement.',
  },
  {
    icon: Pill,
    title: 'Stay on track',
    description: 'See medication, appointment, symptom, and care-team information together.',
  },
  {
    icon: ShieldPlus,
    title: 'Help stays close',
    description: 'Emergency support remains a clear destination across screen sizes.',
  },
] as const;

export function LandingPage() {
  usePageMeta({
    title: 'Accessible Care Management',
    description:
      'Manage medications, appointments, symptoms, and care-team updates with accessible, low-effort controls.',
  });

  return (
    <div className={styles.publicPage}>
      <header className={styles.publicHeader}>
        <Link to={routes.landing} className={styles.publicBrand}>
          <Brand />
        </Link>
        <nav aria-label="Public">
          <Link className={styles.headerLink} to={routes.login}>
            Sign in
          </Link>
        </nav>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>CARE THAT MEETS YOU WHERE YOU ARE</p>
            <h1 id="hero-title">Take care of yourself today.</h1>
            <p className={styles.heroLead}>
              Care coordination designed for hands that hurt. Calm, clear, and accessible
              from desktop to mobile.
            </p>
            <Link className={styles.primaryCta} to={routes.login}>
              Get started <ArrowRight size={20} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className={styles.features} aria-labelledby="features-title">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>BUILT AROUND ACCESS</p>
            <h2 id="features-title">Less effort. More confidence.</h2>
          </div>
          <div className={styles.featureGrid}>
            {features.map(({ icon: Icon, title, description }) => (
              <article key={title} className={styles.featureCard}>
                <span className={styles.featureIcon} aria-hidden="true">
                  <Icon size={25} />
                </span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className={styles.publicFooter}>
        <Brand compact />
        <p>Accessible care management for severe Carpal Tunnel Syndrome.</p>
      </footer>
    </div>
  );
}
