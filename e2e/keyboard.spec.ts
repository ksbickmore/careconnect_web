import { expect, test } from '@playwright/test';
import { gotoAuthed, signInAsGuest } from './helpers';

// Pure keyboard journeys — no mouse after sign-in.
test.describe('keyboard accessibility', () => {
  test('the skip link is first in the Tab order and jumps to main content', async ({
    page,
  }) => {
    await signInAsGuest(page);

    // The skip link must be the first focusable element in the document.
    const firstFocusableIsSkipLink = await page.evaluate(() => {
      const first = document.querySelector<HTMLElement>(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      return first?.textContent?.trim() === 'Skip to main content';
    });
    expect(firstFocusableIsSkipLink).toBe(true);

    // Activating it moves focus into the main region.
    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('dialogs trap focus, close on Escape, and restore focus to the trigger', async ({
    page,
  }) => {
    await gotoAuthed(page, '/medications', 'Medications');

    const trigger = page.getByRole('button', { name: 'Add medication' });
    await trigger.focus();
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog', { name: 'Add medication' });
    await expect(dialog).toBeVisible();
    // Focus lands inside the dialog (close button first).
    await expect(dialog.getByRole('button', { name: 'Close dialog' })).toBeFocused();

    // Shift+Tab from the first control wraps to the last — still inside.
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: 'Save medication' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('arrow keys walk the medication list with a roving tabindex', async ({ page }) => {
    await gotoAuthed(page, '/medications', 'Medications');

    await page.getByRole('button', { name: /Lisinopril/ }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('button', { name: /Ibuprofen/ })).toBeFocused();
    await page.keyboard.press('End');
    await expect(page.getByRole('button', { name: /Aspirin/ })).toBeFocused();
    await page.keyboard.press('Home');
    await expect(page.getByRole('button', { name: /Lisinopril/ })).toBeFocused();
  });

  test('filter tabs support arrow-key selection', async ({ page }) => {
    await gotoAuthed(page, '/medications', 'Medications');

    await page.getByRole('tab', { name: /All/ }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: /^Due/ })).toBeFocused();
    await expect(page.getByRole('tab', { name: /^Due/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
