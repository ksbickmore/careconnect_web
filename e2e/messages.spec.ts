import { expect, test } from '@playwright/test';
import { gotoAuthed } from './helpers';

test.describe('messages', () => {
  test('opening a thread and sending a reply works on desktop and mobile', async ({
    page,
  }) => {
    await gotoAuthed(page, '/messages', 'Messages');

    await page.getByRole('button', { name: /Dr\. Park/ }).click();
    // Focus moves into the thread pane (drill-in on mobile).
    await expect(page.getByRole('heading', { level: 2, name: 'Dr. Park' })).toBeFocused();

    const input = page.getByLabel('Message Dr. Park');
    await input.fill('See you tomorrow.');
    await page.getByRole('button', { name: 'Send' }).click();

    const thread = page.getByRole('list', { name: 'Messages with Dr. Park' });
    await expect(thread).toContainText('See you tomorrow.');
    await expect(input).toHaveValue('');
  });

  test('the mobile drill-in offers a back button to the conversation list', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Drill-in back button only appears on the mobile layout');

    await gotoAuthed(page, '/messages', 'Messages');

    await page.getByRole('button', { name: /Dr\. Park/ }).click();
    await page.getByRole('button', { name: /All conversations/ }).click();
    await expect(
      page.getByRole('heading', { level: 2, name: 'Conversations' }),
    ).toBeFocused();
  });
});
