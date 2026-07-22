import { expect, test } from '@playwright/test';
import { gotoAuthed } from './helpers';

test.describe('medications', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAuthed(page, '/medications', 'Medications');
  });

  test('two-tap confirm requires a second activation and persists across reload', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /Lisinopril/ }).click();
    const detail = page.getByRole('complementary', { name: 'Medication details' });
    await detail.getByRole('button', { name: 'Confirm taken' }).click();

    // The armed state renames the button — the first tap did not log the dose.
    const armed = detail.getByRole('button', { name: 'Tap again to confirm' });
    await expect(armed).toBeVisible();
    await armed.click();
    await expect(detail).toContainText('Taken');

    // localStorage survives a reload; the in-memory session does not.
    await page.reload();
    await page.getByRole('button', { name: 'Continue as guest' }).click();
    await page.getByRole('heading', { level: 1, name: 'Medications' }).waitFor();
    await page.getByRole('tab', { name: /Taken/ }).click();
    await expect(page.getByRole('button', { name: /Lisinopril/ })).toBeVisible();
  });

  test('filter tabs narrow the list', async ({ page }) => {
    await page.getByRole('tab', { name: /Taken/ }).click();
    await expect(page.getByRole('button', { name: /Aspirin/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Lisinopril/ })).toBeHidden();

    await page.getByRole('tab', { name: /^Due/ }).click();
    await expect(page.getByRole('button', { name: /Lisinopril/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Aspirin/ })).toBeHidden();
  });

  test('the add-medication dialog validates and saves', async ({ page }) => {
    await page.getByRole('button', { name: 'Add medication' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add medication' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Save medication' }).click();
    await expect(dialog.getByRole('alert')).toContainText(
      'Enter both a medication name and a dose.',
    );

    await dialog.getByLabel('Name').fill('Melatonin');
    await dialog.getByLabel('Dose').fill('3 mg');
    await dialog.getByRole('button', { name: 'Save medication' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: /Melatonin/ })).toBeVisible();
  });
});
