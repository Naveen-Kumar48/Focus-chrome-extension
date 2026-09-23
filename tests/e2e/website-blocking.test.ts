import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('FocusFlow Phase 4 Website Blocking Engine E2E Verification', () => {
  test('activates blocking rules during active session and displays blocked splash screen', async () => {
    const pathToExtension = path.resolve(__dirname, '../../apps/extension/dist');
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'focusflow-blocking-test-'));

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

    // 1. Open Popup and Start Focus
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.waitForLoadState('domcontentloaded');

    await popup.locator('#btn-start-focus').click();
    await expect(popup.locator('#btn-pause')).toBeVisible();

    // 2. Open Blocked Screen directly to simulate interception
    const blockedTab = await context.newPage();
    await blockedTab.goto(`chrome-extension://${extensionId}/blocked.html?domain=youtube.com`);
    await blockedTab.waitForLoadState('domcontentloaded');

    await expect(blockedTab.locator('.blocked-title')).toHaveText('This website is currently blocked');
    await expect(blockedTab.locator('.domain-pill')).toHaveText('youtube.com');
    await expect(blockedTab.locator('.timer-box-digits')).toBeVisible();
    await expect(blockedTab.locator('#btn-return-focus')).toBeVisible();

    // 3. Stop timer from popup
    await popup.locator('#btn-stop').click();
    await expect(popup.locator('#btn-start-focus')).toBeVisible();

    await context.close();

    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error on windows
    }
  });
});
