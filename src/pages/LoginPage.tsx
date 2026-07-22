import { ArrowLeft, LogIn } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Brand } from '@/components/Brand';
import { routes } from '@/lib/routes';
import { usePageMeta } from '@/lib/use-page-meta';
import { useAuthStore } from '@/stores/auth-store';
import styles from './pages.module.css';

interface RedirectState {
  readonly from?: string;
}

export function LoginPage() {
  usePageMeta({
    title: 'Sign In',
    description: 'Sign in to the CareConnect local demonstration.',
  });
  const navigate = useNavigate();
  const location = useLocation();
  const signIn = useAuthStore((state) => state.signIn);
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest);
  const [email, setEmail] = useState('demo@careconnect.app');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState<string | null>(null);
  const redirect = (location.state as RedirectState | null)?.from ?? routes.dashboard;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signIn(email, password)) {
      setError('Enter both an email address and password.');
      return;
    }
    void navigate(redirect, { replace: true });
  };

  const guest = () => {
    continueAsGuest();
    // Honor the guarded route the visitor originally asked for.
    void navigate(redirect, { replace: true });
  };

  return (
    <div className={styles.loginPage}>
      <header className={styles.loginHeader}>
        <Link to={routes.landing} className={styles.publicBrand}>
          <Brand compact />
        </Link>
      </header>
      <main className={styles.loginMain}>
        <section className={styles.loginCard} aria-labelledby="login-title">
          <Link to={routes.landing} className={styles.backLink}>
            <ArrowLeft size={18} aria-hidden="true" /> Back to home
          </Link>
          <p className={styles.eyebrow}>CARECONNECT DEMO</p>
          <h1 id="login-title">Welcome back</h1>
          <p className={styles.loginIntro}>
            Demo credentials are ready. Sign in, or continue without an account.
          </p>

          <form onSubmit={submit} noValidate>
            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                aria-invalid={error != null}
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                aria-invalid={error != null}
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>
            {error && (
              <p id="login-error" className={styles.formError} role="alert">
                {error}
              </p>
            )}
            <button className={styles.loginButton} type="submit">
              <LogIn size={19} aria-hidden="true" /> Sign in
            </button>
            <button className={styles.guestButton} type="button" onClick={guest}>
              Continue as guest
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
