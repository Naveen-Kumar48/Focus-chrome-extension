import { storageService } from '../storage/chromeStorage';
import {
  ExtensionMessage,
  MessageResponse,
  ActiveTimerState,
  CompletedSessionRecord
} from '@focusflow/shared';
import {
  startTimer,
  pauseTimer,
  resumeTimer,
  stopTimer,
  resetTimer,
  setTimerDuration,
  checkTimerExpiry,
  calculateRemainingSeconds,
  formatRemainingToBadge
} from '../services/timerEngine';

export const ALARM_TIMER_KEY = 'focusflow-timer-alarm';

console.log('[FocusFlow] Service Worker background script loaded.');

/**
 * Updates the extension toolbar badge with remaining time or status.
 */
export async function updateToolbarBadge(timer: ActiveTimerState) {
  if (typeof chrome === 'undefined' || !chrome.action) return;

  const remaining = calculateRemainingSeconds(timer);
  const { text, color } = formatRemainingToBadge(remaining, timer.status);

  try {
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color });
  } catch (err) {
    console.debug('[FocusFlow] Could not update badge:', err);
  }
}

/**
 * Checks and reconciles timer status upon service worker startup or wakeup.
 */
async function reconcileTimerState() {
  try {
    const timer = await storageService.get('activeTimer');
    const { isExpired, nextState, completedRecord } = checkTimerExpiry(timer);

    if (isExpired && completedRecord) {
      console.log('[FocusFlow] Timer expired while service worker was suspended/inactive.');
      await storageService.set('activeTimer', nextState);

      // Append completed session to session history
      const sessions = (await storageService.get('sessions')) || [];
      const sessionWithId: CompletedSessionRecord = {
        ...(completedRecord as CompletedSessionRecord),
        id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        profileName: 'Focus Session'
      };
      await storageService.set('sessions', [sessionWithId, ...sessions]);

      await chrome.alarms.clear(ALARM_TIMER_KEY);
      await updateToolbarBadge(nextState);
    } else {
      await updateToolbarBadge(timer);
    }
  } catch (err) {
    console.error('[FocusFlow] Error reconciling timer state:', err);
  }
}

// Extension installation and update lifecycle
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log(`[FocusFlow] Extension installed/updated: reason = ${details.reason}`);
  try {
    const initialState = await storageService.initialize();
    await updateToolbarBadge(initialState.activeTimer);
  } catch (err) {
    console.error('[FocusFlow] Error during installation initialization:', err);
  }
});

// Browser startup lifecycle
chrome.runtime.onStartup.addListener(async () => {
  console.log('[FocusFlow] Browser started. Reconciling timer state...');
  await reconcileTimerState();
});

// Alarm trigger handler: awakens service worker at targetEndTime
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_TIMER_KEY) {
    console.log('[FocusFlow] Timer alarm triggered!');
    await reconcileTimerState();

    // Trigger notification if enabled
    try {
      const settings = await storageService.get('settings');
      if (settings?.notificationsEnabled && chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon-128.png',
          title: 'FocusFlow — Focus Session Complete! 🎉',
          message: 'Excellent work! You have completed your scheduled focus session.',
          priority: 2
        });
      }
    } catch (err) {
      console.debug('[FocusFlow] Notification delivery error:', err);
    }
  }
});

// Incoming message handler for Popup and Options
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ) => {
    if (sender.id !== chrome.runtime.id) {
      sendResponse({ success: false, error: 'Unauthorized sender' });
      return false;
    }

    if (!message || !message.type) {
      sendResponse({ success: false, error: 'Invalid message payload' });
      return false;
    }

    (async () => {
      try {
        const currentTimer = await storageService.get('activeTimer');

        switch (message.type) {
          case 'TIMER_START': {
            const payload = message.payload as { durationSeconds?: number; profileId?: string } | undefined;
            const updated = startTimer(currentTimer, payload);
            await storageService.set('activeTimer', updated);

            if (updated.targetEndTime) {
              await chrome.alarms.create(ALARM_TIMER_KEY, { when: updated.targetEndTime });
            }
            await updateToolbarBadge(updated);
            sendResponse({ success: true, data: updated });
            break;
          }

          case 'TIMER_PAUSE': {
            const updated = pauseTimer(currentTimer);
            await storageService.set('activeTimer', updated);
            await chrome.alarms.clear(ALARM_TIMER_KEY);
            await updateToolbarBadge(updated);
            sendResponse({ success: true, data: updated });
            break;
          }

          case 'TIMER_RESUME': {
            const updated = resumeTimer(currentTimer);
            await storageService.set('activeTimer', updated);
            if (updated.targetEndTime) {
              await chrome.alarms.create(ALARM_TIMER_KEY, { when: updated.targetEndTime });
            }
            await updateToolbarBadge(updated);
            sendResponse({ success: true, data: updated });
            break;
          }

          case 'TIMER_STOP': {
            const { nextState, interruptedRecord } = stopTimer(currentTimer);
            await storageService.set('activeTimer', nextState);
            await chrome.alarms.clear(ALARM_TIMER_KEY);

            if (interruptedRecord) {
              const sessions = (await storageService.get('sessions')) || [];
              const sessionWithId: CompletedSessionRecord = {
                ...(interruptedRecord as CompletedSessionRecord),
                id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                profileName: 'Interrupted Session'
              };
              await storageService.set('sessions', [sessionWithId, ...sessions]);
            }

            await updateToolbarBadge(nextState);
            sendResponse({ success: true, data: nextState });
            break;
          }

          case 'TIMER_RESET': {
            const updated = resetTimer(currentTimer);
            await storageService.set('activeTimer', updated);
            await chrome.alarms.clear(ALARM_TIMER_KEY);
            await updateToolbarBadge(updated);
            sendResponse({ success: true, data: updated });
            break;
          }

          case 'TIMER_SET_DURATION': {
            const payload = message.payload as { durationSeconds: number };
            const updated = setTimerDuration(currentTimer, payload.durationSeconds);
            await storageService.set('activeTimer', updated);
            await updateToolbarBadge(updated);
            sendResponse({ success: true, data: updated });
            break;
          }

          case 'GET_TIMER_STATE': {
            const remaining = calculateRemainingSeconds(currentTimer);
            sendResponse({ success: true, data: { ...currentTimer, remainingSeconds: remaining } });
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
        console.error(`[FocusFlow] Error processing ${message.type}:`, err);
        sendResponse({ success: false, error: errorMessage });
      }
    })();

    return true;
  }
);
