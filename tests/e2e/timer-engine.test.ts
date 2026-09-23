import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('FocusFlow Phase 2 Timer Engine E2E Verification', () => {
  test('persists timer across popup close and reopen, handles presets, pause, resume, and stop', async () => {
    const pathToExtension = path.resolve(__dirname, '../../apps/extension/dist');
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'focusflow-timer-test-'));

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

    // 1. Open Popup
    let popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.waitForLoadState('domcontentloaded');

    // Default display is 25:00
    await expect(popup.locator('#timer-display-time')).toHaveText('25:00');

    // Click 15m preset
    await popup.locator('#preset-15').click();
    await expect(popup.locator('#timer-display-time')).toHaveText('15:00');

    // 2. Start Focus
    await popup.locator('#btn-start-focus').click();
    await expect(popup.locator('#btn-pause')).toBeVisible();
    await expect(popup.locator('#btn-stop')).toBeVisible();

    // 3. Close Popup while timer is running
    await popup.close();

    // Wait 2.5 seconds to simulate background running
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // 4. Reopen Popup and verify timer survived and counted down
    popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.waitForLoadState('domcontentloaded');

    // Active status should still be present
    await expect(popup.locator('.status-badge')).toHaveText('Active');
    const displayAfterReopen = await popup.locator('#timer-display-time').innerText();
    expect(displayAfterReopen).toMatch(/14:5[6-8]/); // Should have ticked down ~2-3 seconds

    // 5. Pause timer
    await popup.locator('#btn-pause').click();
    await expect(popup.locator('#btn-resume')).toBeVisible();
    await expect(popup.locator('#btn-reset')).toBeVisible();
    await expect(popup.locator('.status-badge')).toHaveText('Paused');

    const pausedDigits = await popup.locator('#timer-display-time').innerText();
    // Wait 1.5 seconds and verify frozen
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await expect(popup.locator('#timer-display-time')).toHaveText(pausedDigits);

    // 6. Resume timer
    await popup.locator('#btn-resume').click();
    await expect(popup.locator('#btn-pause')).toBeVisible();

    // 7. Stop timer
    await popup.locator('#btn-stop').click();
    await expect(popup.locator('#btn-start-focus')).toBeVisible();
    await expect(popup.locator('.status-badge')).toHaveText('Focus');

    await context.close();

    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error on windows
    }
  });
});
