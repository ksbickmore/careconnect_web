import { defineConfig, devices } from '@playwright/test';

/**
 * E2E configuration. Runs against the production build via `vite preview`
 * (required for the service-worker/offline spec — the SW only exists in a
 * built bundle).
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Exercises the mobile bottom nav and the Messages drill-in layout.
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
