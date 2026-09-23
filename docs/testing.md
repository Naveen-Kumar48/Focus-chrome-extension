# FocusFlow Comprehensive Testing Strategy

## 1. Quality Philosophy & Testing Pyramid

FocusFlow adheres to a strict testing discipline: **every phase must be validated with automated tests before advancing to the next**. The testing pyramid balances fast, deterministic unit tests with browser-level integration and end-to-end verification.

```
                  / \
                 /   \
                / E2E \       Playwright Headless Chromium
               / (10%) \      - Real extension loading
              /---------\     - Tab navigation & DNR redirects
             /           \
            / Integration \   Component + Storage Integration
           /     (30%)     \  - React Testing Library + Fake Chrome APIs
          /-----------------\ - Multi-view synchronization
         /                   \
        /     Unit Tests      \  Vitest + Strict TypeScript
       /        (60%)          \ - Timer math, domain normalizer
      /-------------------------\- Rule compiler, Pomodoro state machine
```

---

## 2. Unit Testing Strategy (Vitest)

Unit tests run in node/jsdom environments with sub-second execution speeds, validating pure business logic and algorithmic correctness.

### 2.1 Domain Normalizer Test Matrix (`packages/validation/src/domain.test.ts`)
| Test Case | Input | Expected Output |
| :--- | :--- | :--- |
| Standard root domain | `"youtube.com"` | `{ isValid: true, normalizedDomain: "youtube.com" }` |
| Uppercase with whitespace | `"   REDDIT.COM   "` | `{ isValid: true, normalizedDomain: "reddit.com" }` |
| HTTP protocol prefix | `"http://instagram.com"` | `{ isValid: true, normalizedDomain: "instagram.com" }` |
| HTTPS protocol with path | `"https://facebook.com/feed"` | `{ isValid: true, normalizedDomain: "facebook.com" }` |
| Subdomain preservation | `"m.youtube.com"` | `{ isValid: true, normalizedDomain: "m.youtube.com" }` |
| Leading www removal | `"www.twitter.com"` | `{ isValid: true, normalizedDomain: "twitter.com" }` |
| Port stripping | `"localhost:3000"` | `{ isValid: true, normalizedDomain: "localhost" }` |
| Query string & hash removal | `"x.com/home?s=09#top"` | `{ isValid: true, normalizedDomain: "x.com" }` |
| Invalid characters | `"youtube .com"`, `"evil$site.org"`| `{ isValid: false, error: ... }` |
| Internal schemes | `"chrome://extensions"` | `{ isValid: false, error: ... }` |
| Missing TLD | `"justaword"` | `{ isValid: false, error: ... }` |

### 2.2 Timer Engine Test Matrix (`apps/extension/src/services/timer.test.ts`)
| Test Scenario | Setup | Action | Assertion |
| :--- | :--- | :--- | :--- |
| **Fresh Start** | Idle, duration = 1500s | `timerStart(1500)` | `status === 'running'`, `startedAt !== null`, remaining = 1500s |
| **Elapsed Calculation** | Started 300s ago | `calculateRemainingSeconds()` | Returns exactly `1200` seconds |
| **Pause State** | Running for 100s | `timerPause()` | `status === 'paused'`, `pausedAt !== null`, remaining frozen at 1400s |
| **Sleep / Drift Recovery** | Paused for 500s then resumed | `timerResume()` | `accumulatedPausedMs += 500000`, target end time shifted forward by 500s |
| **Completion Trigger** | Started 1501s ago | `checkTimerStatus()` | Transitions to `completed`, fires completion callback, cleans up alarms |
| **Manual Reset** | Running at 800s | `timerReset()` | `status === 'idle'`, timestamps reset to `null` |

### 2.3 DNR Rule Compiler Test Matrix (`apps/extension/src/services/dnr.test.ts`)
| Test Scenario | Input Profile | Assertion |
| :--- | :--- | :--- |
| **Single Block** | Block: `["youtube.com"]`, Allow: `[]` | 1 rule generated; `priority: 1`, `action.type: 'redirect'`, `urlFilter: "\|\|youtube.com"` |
| **Block with Subdomain Exception** | Block: `["youtube.com"]`, Allow: `["music.youtube.com"]` | 2 rules generated: Block rule (priority 1) + Allow rule (priority 2, `action.type: 'allow'`) |
| **Deterministic IDs** | 5 blocked domains | Rule IDs sequentially allocated within the assigned range `10001–10005` without collisions |

### 2.4 Pomodoro Cycle Test Matrix (`apps/extension/src/services/pomodoro.test.ts`)
- Focus session 1 completes -> Transitions to Short Break (cycle 1/4).
- Short break completes -> Transitions to Focus session 2 (cycle 2/4).
- Focus session 4 completes -> Transitions to Long Break (cycle 4/4).
- Long break completes -> Resets cycle counter to 1.

---

## 3. Chrome Extension Mocking Harness

To execute tests without requiring an active Chrome browser window, FocusFlow includes a dedicated, zero-dependency Chrome API mock harness (`tests/mocks/chrome.ts`).

```typescript
export function createMockChrome() {
  const store: Record<string, any> = {};
  const storageListeners: Array<(changes: any, area: string) => void> = [];
  const alarmListeners: Array<(alarm: any) => void> = [];

  return {
    storage: {
      local: {
        get: vi.fn(async (keys?: string | string[] | null) => {
          if (!keys) return { ...store };
          if (typeof keys === 'string') return { [keys]: store[keys] };
          const result: Record<string, any> = {};
          keys.forEach(k => { result[k] = store[k]; });
          return result;
        }),
        set: vi.fn(async (items: Record<string, any>) => {
          const changes: Record<string, any> = {};
          for (const key of Object.keys(items)) {
            changes[key] = { oldValue: store[key], newValue: items[key] };
            store[key] = items[key];
          }
          storageListeners.forEach(listener => listener(changes, 'local'));
        }),
        clear: vi.fn(async () => {
          Object.keys(store).forEach(k => delete store[k]);
        })
      },
      onChanged: {
        addListener: vi.fn((fn) => storageListeners.push(fn)),
        removeListener: vi.fn((fn) => {
          const idx = storageListeners.indexOf(fn);
          if (idx > -1) storageListeners.splice(idx, 1);
        })
      }
    },
    alarms: {
      create: vi.fn(),
      clear: vi.fn(),
      onAlarm: {
        addListener: vi.fn((fn) => alarmListeners.push(fn))
      }
    },
    declarativeNetRequest: {
      updateDynamicRules: vi.fn(async () => {}),
      getDynamicRules: vi.fn(async () => [])
    },
    runtime: {
      id: 'mock-focusflow-extension-id',
      sendMessage: vi.fn(),
      getURL: vi.fn((path: string) => `chrome-extension://mock-focusflow-extension-id${path}`)
    }
  };
}
```

---

## 4. End-to-End Testing (Playwright)

End-to-end tests validate the packaged extension inside real Chromium instances.

### 4.1 Launching the Extension in Playwright
```typescript
import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    const pathToExtension = path.resolve(__dirname, '../../apps/extension/dist');
    const context = await chromium.launchPersistentContext('', {
      headless: false, // Extensions require headed Chromium
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers();
    if (!background) background = await context.waitForEvent('serviceworker');
    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },
});
```

### 4.2 Core E2E Scenarios
1. **Popup Mounting**:
   - Navigate to `chrome-extension://${extensionId}/popup.html`.
   - Verify initial display: `"25:00"`, `"Start Focus"`, and `"Today's Focus: 0 minutes"`.
2. **Session Start & Blocker Activation**:
   - Click `"Start Focus"`.
   - Open a new tab and navigate to `https://www.youtube.com`.
   - Verify the tab is redirected to `chrome-extension://${extensionId}/blocked.html?domain=youtube.com`.
   - Verify the blocked page displays the active countdown timer and "Return to Focus" button.
3. **Session Stop & Blocker Deactivation**:
   - Open popup, click `"Stop"`.
   - Reload `https://www.youtube.com`.
   - Verify access is restored.

---

## 5. Continuous Testing Pipeline

Every pull request and build command runs the full verification pipeline:

```bash
# 1. Type checking across monorepo
pnpm run typecheck

# 2. ESLint code quality & security rules
pnpm run lint

# 3. Unit and integration tests
pnpm run test:unit

# 4. Production build verification
pnpm run build

# 5. Extension artifact audit
pnpm run test:extension-audit
```
