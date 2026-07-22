import { expect, test } from '@playwright/test';
import { gotoAuthed } from './helpers';

test.describe('settings', () => {
  test('text size persists across a reload', async ({ page }) => {
    await gotoAuthed(page, '/settings', 'Settings');

    await page.getByRole('radio', { name: /Extra large/ }).check();
    await expect(page.locator('body')).toHaveCSS('zoom', '1.3');

    await page.reload();
    await page.getByRole('button', { name: 'Continue as guest' }).click();
    await page.getByRole('heading', { level: 1, name: 'Settings' }).waitFor();
    await expect(page.getByRole('radio', { name: /Extra large/ })).toBeChecked();
    await expect(page.locator('body')).toHaveCSS('zoom', '1.3');
  });

  test('reduce motion toggles the root class', async ({ page }) => {
    await gotoAuthed(page, '/settings', 'Settings');

    await page.getByRole('checkbox', { name: /Reduce motion/ }).check();
    await expect(page.locator('html')).toHaveClass(/reduce-motion/);
  });

  test('settings are reachable from the header profile link (mobile path)', async ({
    page,
  }) => {
    await gotoAuthed(page, '/dashboard', /Good morning/);

    await page.getByRole('link', { name: /^Profile:/ }).click();
    await page.getByRole('heading', { level: 1, name: 'Profile' }).waitFor();
    await page.getByRole('link', { name: 'Open settings' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  });
});
