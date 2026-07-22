import { expect, test } from '@playwright/test';

// Service-worker offline support (production build only).
test.describe('offline (PWA)', () => {
  test('the app shell loads and works with the network offline', async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Service-worker test runs on Chromium only');

    await page.goto('/');
    // Wait for the service worker to be active and controlling.
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });

    await context.setOffline(true);
    await page.reload();

    // The precached shell renders with no network.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Take care of yourself today.',
    );

    // A full offline journey: sign in and reach the emergency contacts
    // via client-side navigation (a hard goto would reset the session).
    await page.getByRole('link', { name: 'Sign in' }).first().click();
    await page.getByRole('button', { name: 'Continue as guest' }).click();
    await page.getByRole('link', { name: /SOS/ }).first().click();
    await expect(page.getByRole('heading', { name: 'Call 911' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Call Sarah Vance' })).toBeVisible();

    await context.setOffline(false);
  });
});
