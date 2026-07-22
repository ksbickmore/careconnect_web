import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ReloadPrompt } from '@/components/ReloadPrompt';
import { AppShell } from '@/layout/AppShell';
import { routes } from '@/lib/routes';
import { DashboardPage } from '@/pages/DashboardPage';
import { EmergencyPage } from '@/pages/EmergencyPage';
import { HealthLogPage } from '@/pages/HealthLogPage';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { MedicationsPage } from '@/pages/MedicationsPage';
import { MessagesPage } from '@/pages/MessagesPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SchedulePage } from '@/pages/SchedulePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { useAuthStore } from '@/stores/auth-store';

function RequireAuth() {
  const signedIn = useAuthStore((state) => state.signedIn);
  const location = useLocation();
  return signedIn ? <AppShell /> : <Navigate to={routes.login} replace state={{ from: location.pathname }} />;
}

export function App() {
  return (
    <>
      {/* Registers the service worker on every page, incl. the public ones. */}
      <ReloadPrompt />
      <Routes>
      <Route path={routes.landing} element={<LandingPage />} />
      <Route path={routes.login} element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path={routes.dashboard} element={<DashboardPage />} />
        <Route path={routes.medications} element={<MedicationsPage />} />
        <Route path={routes.schedule} element={<SchedulePage />} />
        <Route path={routes.messages} element={<MessagesPage />} />
        <Route path={routes.healthLog} element={<HealthLogPage />} />
        <Route path={routes.emergency} element={<EmergencyPage />} />
        <Route path={routes.profile} element={<ProfilePage />} />
        <Route path={routes.settings} element={<SettingsPage />} />
      </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
