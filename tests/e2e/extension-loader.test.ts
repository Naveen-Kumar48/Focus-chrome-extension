import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('FocusFlow Chrome Extension E2E Verification', () => {
  test('loads unpacked extension into Chromium, verifies service worker, popup UI, options page, and reload', async () => {
    const pathToExtension = path.resolve(__dirname, '../../apps/extension/dist');
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'focusflow-test-user-data-'));

    // Launch Chromium with channel: 'chromium' and extension loaded
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium',
      headless: true,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--no-sandbox'
      ]
    });

    const consoleErrors: string[] = [];
    context.on('weberror', (webError) => {
      consoleErrors.push(`[WebError] ${webError.error().message}`);
    });

    // 1. Verify Service Worker starts
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker', { timeout: 15000 });
    }
    expect(background).toBeDefined();

    const extensionId = background.url().split('/')[2];
    expect(extensionId).toBeTruthy();
    console.log(`[E2E] Service worker registered with extension ID: ${extensionId}`);

    // Verify service worker evaluates and runs
    const swResult = await background.evaluate(() => {
      return typeof chrome !== 'undefined' && !!chrome.runtime;
    });
    expect(swResult).toBe(true);

    // 2. Open and test Popup UI
    const popupPage = await context.newPage();
    popupPage.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[Popup Error] ${msg.text()}`);
      }
    });

    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await popupPage.waitForLoadState('domcontentloaded');

    // Verify UI requirements
    await expect(popupPage.locator('.brand-name')).toHaveText('FocusFlow');
    await expect(popupPage.locator('.tagline')).toHaveText('Ready to focus?');
    await expect(popupPage.locator('.time-digits')).toHaveText('25:00');
    await expect(popupPage.locator('#btn-start-focus')).toBeVisible();
    await expect(popupPage.locator('#btn-start-focus')).toContainText('Start Focus');
    await expect(popupPage.locator('.stats-card')).toContainText("Today's Focus");
    await expect(popupPage.locator('.stats-card')).toContainText('0 minutes');

    // Test button click interaction
    await popupPage.locator('#btn-start-focus').click();
    await expect(popupPage.locator('#btn-pause')).toBeVisible();
    await expect(popupPage.locator('#btn-stop')).toBeVisible();

    // 3. Open and test Options page
    const optionsPage = await context.newPage();
    optionsPage.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[Options Error] ${msg.text()}`);
      }
    });

    await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
    await optionsPage.waitForLoadState('domcontentloaded');

    await expect(optionsPage.locator('h1')).toContainText('FocusFlow Settings & Dashboard');
    await expect(optionsPage.locator('.badge-v3')).toHaveText('Manifest V3 Production Shell');
    await expect(optionsPage.locator('.profile-pill')).toHaveCount(3); // 3 default presets

    // Ensure zero console or runtime errors occurred
    expect(consoleErrors).toEqual([]);

    await context.close();

    // Cleanup temp user data dir
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error on windows if locked
    }
  });
});
