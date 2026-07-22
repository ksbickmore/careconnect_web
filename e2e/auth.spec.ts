import { expect, test } from '@playwright/test';
import { gotoAuthed } from './helpers';

test.describe('authentication', () => {
  test('landing page links to sign in and the dashboard is reachable after login', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Take care of yourself today.',
    );

    await page.getByRole('link', { name: 'Sign in' }).first().click();
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    // Demo credentials are prefilled.
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Good morning');
  });

  test('a signed-out visitor is redirected from protected routes to login', async ({
    page,
  }) => {
    await page.goto('/medications');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('the guard preserves the requested page through guest sign-in', async ({ page }) => {
    await gotoAuthed(page, '/health-log', 'Health Log');
    await expect(page).toHaveURL(/\/health-log$/);
  });

  test('signing out from the profile page returns to login', async ({ page }) => {
    await gotoAuthed(page, '/profile', 'Profile');
    await page
      .getByRole('region', { name: 'Session' })
      .getByRole('button', { name: 'Sign out' })
      .click();
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });
});
