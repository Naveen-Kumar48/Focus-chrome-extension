import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('FocusFlow Phase 3 Website Management E2E Verification', () => {
  test('manages blocked domains: add with normalization, duplicate prevention, and deletion', async () => {
    const pathToExtension = path.resolve(__dirname, '../../apps/extension/dist');
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'focusflow-webmgmt-test-'));

    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium',
      headless: true,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--no-sandbox'
      ]
    });

    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker', { timeout: 15000 });
    }
    expect(background).toBeDefined();

    const extensionId = background.url().split('/')[2];

    // Open Options page
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('domcontentloaded');

    // Verify initial list contains YouTube
    await expect(page.locator('.website-item').filter({ hasText: 'youtube.com' })).toBeVisible();

    // 1. Add new domain with URL format to test normalization
    await page.locator('#input-new-domain').fill('https://www.twitch.tv/directory?game=chess');
    await page.locator('#btn-add-website').click();

    // Verify normalized domain twitch.tv appears
    const twitchItem = page.locator('.website-item').filter({ hasText: 'twitch.tv' });
    await expect(twitchItem).toBeVisible();
    await expect(page.locator('.notice-banner')).toContainText("Added 'twitch.tv'");

    // 2. Test duplicate prevention
    await page.locator('#input-new-domain').fill('twitch.tv');
    await page.locator('#btn-add-website').click();

    await expect(page.locator('.error-text')).toContainText("already in your blocked list");

    // 3. Remove domain
    const removeTwitchBtn = page.getByLabel('Remove twitch.tv');
    await removeTwitchBtn.click();

    await expect(page.locator('.notice-banner')).toContainText("Removed 'twitch.tv'");
    await expect(page.locator('.website-item').filter({ hasText: 'twitch.tv' })).toHaveCount(0);

    await context.close();

    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error on windows
    }
  });
});
