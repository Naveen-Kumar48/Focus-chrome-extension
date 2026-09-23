import { storageService } from '../storage/chromeStorage';
import { ExtensionMessage, MessageResponse } from '@focusflow/shared';

console.log('[FocusFlow] Service Worker background script loaded.');

// Handle extension installation and updates
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log(`[FocusFlow] Extension installed/updated: reason = ${details.reason}`);
  try {
    const initialState = await storageService.initialize();
    console.log('[FocusFlow] Initial state verified:', {
      version: initialState.version,
      profile: initialState.activeProfileId,
      timerStatus: initialState.activeTimer.status
    });
  } catch (err) {
    console.error('[FocusFlow] Error initializing storage during installation:', err);
  }
});

// Handle browser startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('[FocusFlow] Browser started. Verifying service worker state...');
  try {
    await storageService.initialize();
  } catch (err) {
    console.error('[FocusFlow] Error during startup initialization:', err);
  }
});

// Handle incoming typed messages from popup, options, or content scripts
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ) => {
    // Basic origin guard
    if (sender.id !== chrome.runtime.id) {
      console.warn('[FocusFlow Security] Message received from unauthorized sender:', sender.id);
      sendResponse({ success: false, error: 'Unauthorized sender' });
      return false;
    }

    if (!message || !message.type) {
      sendResponse({ success: false, error: 'Invalid message payload' });
      return false;
    }

    (async () => {
      try {
        switch (message.type) {
          case 'GET_TIMER_STATE': {
            const timer = await storageService.get('activeTimer');
            sendResponse({ success: true, data: timer });
            break;
          }
          case 'SYNC_STATE': {
            const all = await storageService.getAll();
            sendResponse({ success: true, data: all });
            break;
          }
          default:
            sendResponse({ success: true, data: { status: 'acknowledged', type: message.type } });
            break;
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown internal error';
        console.error(`[FocusFlow] Error handling message ${message.type}:`, err);
        sendResponse({ success: false, error: errorMessage });
      }
    })();

    return true; // Keep message port open for async response
  }
);
