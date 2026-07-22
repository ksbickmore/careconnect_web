import { expect, test, type Page } from '@playwright/test';
import { gotoAuthed } from './helpers';

/**
 * Voice command flow. CI cannot provide a real microphone or afford the
 * Whisper model download, so transcripts are injected through the documented
 * e2e seam (the `careconnect:voice-transcript` CustomEvent), which exercises
 * the full dispatch pipeline: registry → dialog handling → navigation →
 * button fallback. The engine itself is covered by unit tests and manual
 * runtime verification.
 */
const speak = (page: Page, transcript: string) =>
  page.evaluate(
    (detail) =>
      document.dispatchEvent(
        new CustomEvent('careconnect:voice-transcript', { detail }),
      ),
    transcript,
  );

test.describe('voice commands', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAuthed(page, '/dashboard', /Good morning/);
  });

  test('the voice bar renders on authenticated pages', async ({ page }) => {
    const bar = page.getByRole('region', { name: 'Voice commands' });
    await expect(bar).toBeVisible();
    await expect(
      bar.getByRole('button', { name: 'Start voice command' }),
    ).toBeVisible();
    await expect(bar).toContainText('Tap to speak a command');
  });

  test('a navigation keyword changes the page', async ({ page }) => {
    await speak(page, 'go to medications');
    await expect(page).toHaveURL('/medications');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Medications' }),
    ).toBeVisible();
  });

  test('voice fills and saves the add-medication dialog', async ({ page }) => {
    await speak(page, 'go to medications');
    await page.getByRole('heading', { level: 1, name: 'Medications' }).waitFor();

    await speak(page, 'add medication');
    const dialog = page.getByRole('dialog', { name: 'Add medication' });
    await expect(dialog).toBeVisible();

    await speak(page, 'name fish oil');
    await expect(dialog.getByLabel('Name')).toHaveValue('fish oil');
    await speak(page, 'dose 1000 mg');
    await expect(dialog.getByLabel('Dose')).toHaveValue('1000 mg');

    await speak(page, 'save');
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: /fish oil 1000 mg/i })).toBeVisible();
  });

  test('an unrecognized phrase shows the Heard hint', async ({ page }) => {
    await speak(page, 'make me a sandwich');
    await expect(
      page.getByRole('region', { name: 'Voice commands' }),
    ).toContainText('Heard: "make me a sandwich"');
  });

  test('Ctrl+Space reaches the mic and surfaces a graceful mic error', async ({
    page,
  }) => {
    // Headless CI has no usable microphone; the exact failure differs by
    // environment (denied / no device / unsupported constraints), so accept
    // any of the engine's human-readable messages — the point is that the
    // shortcut → mic → engine wiring produced one instead of crashing.
    await page.keyboard.press('Control+Space');
    await expect(
      page.getByRole('region', { name: 'Voice commands' }),
    ).toContainText(/denied|no microphone|not supported|not available|in use/i);
  });

  test('the voice bar does not overlap the mobile bottom navigation', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'layout check for the mobile project');

    const bar = page.getByRole('region', { name: 'Voice commands' });
    const bottomNav = page.getByRole('navigation', { name: 'Primary mobile' });
    const barBox = await bar.boundingBox();
    const navBox = await bottomNav.boundingBox();
    expect(barBox).not.toBeNull();
    expect(navBox).not.toBeNull();
    // The bar sits fully above the bottom nav.
    expect(barBox!.y + barBox!.height).toBeLessThanOrEqual(navBox!.y + 1);
  });
});
