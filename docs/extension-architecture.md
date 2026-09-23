# FocusFlow Extension Internal Architecture (Manifest V3)

## 1. Architectural Overview & Manifest V3 Constraints

In Google Chrome Manifest V3, background pages are replaced by ephemeral **Service Workers**. Service workers are terminated by the browser engine after ~30 seconds of inactivity or when all pending promises resolve. Therefore:

> [!IMPORTANT]
> **No In-Memory Persistent Timers**: Global variables like `let timeRemaining = 1500; setInterval(...)` will be destroyed when Chrome suspends the service worker or when the computer enters sleep mode. FocusFlow's entire architecture is **event-driven, state-persisted, and timestamp-based**.

```
+-----------------------------------------------------------------------------------------+
|                                    CHROME BROWSER                                       |
|                                                                                         |
|   +-------------------+      +-------------------+      +---------------------------+   |
|   |   Popup UI        |      |   Options Page    |      |   Custom Blocked Page     |   |
|   |   (React/Vite)    |      |   (React/Vite)    |      |   (blocked.html)          |   |
|   +---------+---------+      +---------+---------+      +-------------+-------------+   |
|             |                          |                              |                 |
|             | User Actions             | Settings Change              | Ping Distraction|
|             v                          v                              v                 |
|       [chrome.runtime.sendMessage] / [chrome.storage.local.set]                         |
|                                        |                                                |
|                                        v                                                |
|             +-------------------------------------------------------+                   |
|             |          BACKGROUND SERVICE WORKER                    |                   |
|             |  (Event-driven, awakens on alarms / storage / msgs)   |                   |
|             +--------------------------+----------------------------+                   |
|                                        |                                                |
|          +-----------------------------+-----------------------------+                  |
|          |                             |                             |                  |
|          v                             v                             v                  |
|  [chrome.alarms]             [chrome.storage.local]     [chrome.declarativeNetRequest]  |
|  - Timer tick & expiry       - Single source of truth   - Dynamic blocking & redirect   |
|  - Schedule poller           - Reactive to UI           - Zero overhead packet filter   |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Timer Engine: High-Precision Timestamp Mathematics

### 2.1 The Timestamp Model
Instead of ticking down a variable each second, FocusFlow defines the timer state via immutable epoch markers:

1. **`startedAt`**: Timestamp (ms) when the focus session started.
2. **`durationSeconds`**: Total planned duration in seconds.
3. **`pausedAt`**: Timestamp (ms) when paused, or `null` if currently running.
4. **`accumulatedPausedMs`**: Total time (ms) spent paused during this session.
5. **`targetEndTime`**: Calculated as `startedAt + (durationSeconds * 1000) + accumulatedPausedMs`.

### 2.2 Remaining Time Calculation
When any UI component mounts or renders (or when the service worker checks progress):

```typescript
export function calculateRemainingSeconds(timer: ActiveTimerState, now: number = Date.now()): number {
  if (timer.status === 'idle' || timer.status === 'completed') {
    return timer.durationSeconds;
  }

  if (timer.status === 'paused' && timer.pausedAt !== null) {
    // Current effective elapsed time up to the moment of pause
    const elapsedMs = (timer.pausedAt - (timer.startedAt ?? timer.pausedAt)) - timer.accumulatedPausedMs;
    const remainingMs = (timer.durationSeconds * 1000) - elapsedMs;
    return Math.max(0, Math.ceil(remainingMs / 1000));
  }

  if (timer.status === 'running' && timer.startedAt !== null) {
    const elapsedMs = (now - timer.startedAt) - timer.accumulatedPausedMs;
    const remainingMs = (timer.durationSeconds * 1000) - elapsedMs;
    return Math.max(0, Math.ceil(remainingMs / 1000));
  }

  return timer.durationSeconds;
}
```

### 2.3 Resiliency Matrix
| Event | Legacy `setInterval` Behavior | FocusFlow Timestamp Behavior |
| :--- | :--- | :--- |
| **Popup closes** | Interval stops or crashes if in popup context | Unaffected; state is in `chrome.storage.local`. |
| **Service worker suspends** | Memory is cleared; timer dies | `chrome.alarms` fires at `targetEndTime` to wake worker. |
| **Computer enters sleep (e.g. 2 hrs)** | Timer pauses in memory; runs 2 hrs behind | Wall clock time advances; on resume, `Date.now() > targetEndTime`, worker completes session. |
| **Browser restart** | Session lost | On startup, worker detects session reached or passed `targetEndTime` and finalizes cleanly. |

---

## 3. Website Blocking Engine (`declarativeNetRequest`)

### 3.1 Architecture & Dynamic Rules
Manifest V3 deprecates blocking `webRequest` in favor of declarative rules evaluated natively in C++ by the Chromium browser network stack.

- FocusFlow uses `chrome.declarativeNetRequest.updateDynamicRules` to dynamically load and unload blocking rules matching the user's active profile.
- When a focus session begins, the blocking rules for the active profile are compiled and registered.
- When the session ends or is paused, dynamic rules are stripped, instantly restoring web access.

### 3.2 Precedence Algorithm: Allowlist vs. Blocklist
Users frequently require granular domain control (e.g. block `youtube.com` but allow `music.youtube.com`, or block social media but allow login authentication redirects).

FocusFlow implements **deterministic rule priorities**:

```
Priority 2: ALLOWLIST RULES (allow navigation, bypass blocker)
Priority 1: BLOCKLIST RULES (redirect main frame to chrome-extension://.../blocked.html)
```

#### Rule Structure Example:
```typescript
// Allow rule for music.youtube.com (Priority 2)
{
  id: 10001,
  priority: 2,
  action: { type: chrome.declarativeNetRequest.RuleActionType.ALLOW },
  condition: {
    urlFilter: "||music.youtube.com",
    resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME]
  }
}

// Block rule for youtube.com (Priority 1)
{
  id: 10002,
  priority: 1,
  action: {
    type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
    redirect: {
      extensionPath: "/blocked.html?domain=youtube.com"
    }
  },
  condition: {
    urlFilter: "||youtube.com",
    resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME]
  }
}
```

Because `priority: 2` exceeds `priority: 1`, requests to `music.youtube.com` match the allow rule first and bypass redirection, while any other request to `youtube.com` is cleanly redirected to the FocusFlow block page.

### 3.3 Rule ID Management
To prevent rule ID collisions, rule IDs are deterministic integers partitioned by purpose:
- **10,000 – 19,999**: User-defined blocked domains.
- **20,000 – 29,999**: User-defined allowed domains.
- Dynamic rule updates compute diffs (`removeRuleIds` and `addRules`) rather than unregistering unrelated rules.

---

## 4. UI Layer Architecture

The extension features three user surfaces:

### 4.1 Popup UI (`src/popup`)
- Fixed dimensions: `380px` width, `540px` height.
- Mounts in `< 80ms`.
- Renders:
  - Circular animated SVG timer with remaining time and progress percentage.
  - Controls: Start, Pause, Resume, Stop/Cancel.
  - Quick profile selector dropdown.
  - Session statistics overview ("Today's Focus").
  - Quick link to Options dashboard.

### 4.2 Options UI (`src/options`)
- Full-page responsive management suite.
- Navigation tabs:
  - **Profiles**: Create, edit, clone, delete profiles; customize blocklist/allowlist.
  - **Analytics**: Charts of daily focus, weekly trends, distraction breakdown.
  - **Pomodoro Settings**: Cycle length, break duration, auto-start toggles.
  - **Schedules**: Recurring focus windows by day and time.
  - **Settings & Privacy**: Theme selection, strict mode toggle, data export/reset.

### 4.3 Custom Blocked Page (`src/blocked`)
- Standalone HTML page served directly from the extension bundle: `chrome-extension://<EXTENSION_ID>/blocked.html`.
- Display elements:
  - Minimalist, distraction-free aesthetic with subtle ambient gradient.
  - Animated motivational quote.
  - Live session timer countdown synchronized with the background engine.
  - Distraction attempt logger: triggers a one-way message to the background worker to log the blocked domain attempt against the current session.
  - "Return to Focus" button (redirects tab to a safe blank or designated productive page).

---

## 5. Message Passing & Reactive State Synchronization

### 5.1 Single Source of Truth
`chrome.storage.local` is the sole source of truth for application state. Neither the popup nor the options page maintains independent duplicate state stores.

### 5.2 Storage Listener (`chrome.storage.onChanged`)
Both the Popup and Options UI register a listener:
```typescript
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if (changes.activeTimer) {
      updateTimerUI(changes.activeTimer.newValue);
    }
    if (changes.profiles) {
      updateProfilesUI(changes.profiles.newValue);
    }
  }
});
```
This guarantees 100% synchronization: if a session is paused from the popup, the options page or active blocked tabs reflect the state change in real time.

### 5.3 Typed Runtime Messages
Runtime messages (`chrome.runtime.sendMessage`) are strictly typed via discriminated unions:

```typescript
export type ExtensionMessage =
  | { type: 'TIMER_START'; payload: { profileId: string; durationSeconds: number; mode: SessionMode } }
  | { type: 'TIMER_PAUSE' }
  | { type: 'TIMER_RESUME' }
  | { type: 'TIMER_STOP'; payload: { reason?: string } }
  | { type: 'TIMER_RESET' }
  | { type: 'LOG_DISTRACTION'; payload: { domain: string } }
  | { type: 'GET_TIMER_STATE' };

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
```
