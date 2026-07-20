import {
  CalendarDays,
  HeartPulse,
  MessageSquare,
  Pill,
  Settings,
  TriangleAlert,
  UserRound,
} from 'lucide-react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from '@/layout/AppShell';
import { routes } from '@/lib/routes';
import { DashboardPage } from '@/pages/DashboardPage';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { useAuthStore } from '@/stores/auth-store';

function RequireAuth() {
  const signedIn = useAuthStore((state) => state.signedIn);
  const location = useLocation();
  return signedIn ? <AppShell /> : <Navigate to={routes.login} replace state={{ from: location.pathname }} />;
}

export function App() {
  return (
    <Routes>
      <Route path={routes.landing} element={<LandingPage />} />
      <Route path={routes.login} element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path={routes.dashboard} element={<DashboardPage />} />
        <Route
          path={routes.medications}
          element={
            <PlaceholderPage
              title="Medications"
              description="Medication lists, detail panels, filters, and dose logging will live here."
              icon={Pill}
            />
          }
        />
        <Route
          path={routes.schedule}
          element={
            <PlaceholderPage
              title="Schedule"
              description="Daily, weekly, and monthly appointment views will live here."
              icon={CalendarDays}
            />
          }
        />
        <Route
          path={routes.messages}
          element={
            <PlaceholderPage
              title="Messages"
              description="Care-team conversations and accessible message composition will live here."
              icon={MessageSquare}
            />
          }
        />
        <Route
          path={routes.healthLog}
          element={
            <PlaceholderPage
              title="Health Log"
              description="Pain, sleep, mood, and symptom history controls will live here."
              icon={HeartPulse}
            />
          }
        />
        <Route
          path={routes.emergency}
          element={
            <PlaceholderPage
              title="Emergency Help"
              description="Two-step emergency contacts and cancellation safeguards will live here."
              icon={TriangleAlert}
            />
          }
        />
        <Route
          path={routes.profile}
          element={
            <PlaceholderPage
              title="Profile"
              description="Patient and care-plan information will live here."
              icon={UserRound}
            />
          }
        />
        <Route
          path={routes.settings}
          element={
            <PlaceholderPage
              title="Settings"
              description="Text size, motion, and future voice preferences will live here."
              icon={Settings}
            />
          }
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
