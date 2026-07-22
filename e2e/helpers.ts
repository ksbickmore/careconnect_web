import type { Page } from '@playwright/test';

/** Auth is in-memory, so every test signs in through the UI (one click). */
export async function signInAsGuest(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Continue as guest' }).click();
  await page.getByRole('heading', { level: 1, name: /Good morning/ }).waitFor();
}

/**
 * Open an authenticated page directly. A hard `goto` resets the in-memory
 * session, so the guard redirects to login with the target preserved in
 * router state; the guest sign-in then lands back on the requested page.
 */
export async function gotoAuthed(page: Page, path: string, headingName: string | RegExp) {
  await page.goto(path);
  await page.getByRole('button', { name: 'Continue as guest' }).click();
  await page.getByRole('heading', { level: 1, name: headingName }).waitFor();
}
