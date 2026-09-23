import { describe, it, expect, beforeEach } from 'vitest';
import { setupChromeMock } from '../../../../tests/mocks/chrome';
import { storageService } from './chromeStorage';
import { DEFAULT_STORAGE_STATE } from '@focusflow/shared';

describe('ChromeStorageService', () => {
  beforeEach(() => {
    setupChromeMock();
  });

  it('initializes storage with defaults if empty', async () => {
    const initialized = await storageService.initialize();
    expect(initialized.version).toBe(DEFAULT_STORAGE_STATE.version);
    expect(initialized.activeProfileId).toBe(DEFAULT_STORAGE_STATE.activeProfileId);
    expect(initialized.activeTimer.status).toBe('idle');
  });

  it('gets and sets specific storage keys', async () => {
    await storageService.initialize();
    await storageService.set('activeProfileId', 'preset-coding');

    const activeProfileId = await storageService.get('activeProfileId');
    expect(activeProfileId).toBe('preset-coding');
  });

  it('supports reactive subscriptions via onChanged listener', async () => {
    await storageService.initialize();

    let observedProfileId = '';
    const unsubscribe = storageService.subscribe('activeProfileId', (newVal) => {
      observedProfileId = newVal;
    });

    await storageService.set('activeProfileId', 'preset-study');
    expect(observedProfileId).toBe('preset-study');

    unsubscribe();
    await storageService.set('activeProfileId', 'preset-deep-work');
    // Value remains previous since unsubscribed
    expect(observedProfileId).toBe('preset-study');
  });

  it('resets storage to defaults', async () => {
    await storageService.initialize();
    await storageService.set('activeProfileId', 'custom-123');

    await storageService.resetToDefaults();
    const current = await storageService.get('activeProfileId');
    expect(current).toBe(DEFAULT_STORAGE_STATE.activeProfileId);
  });
});
