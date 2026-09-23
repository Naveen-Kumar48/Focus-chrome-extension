import { vi } from 'vitest';

export function setupChromeMock() {
  const store: Record<string, any> = {};
  const storageListeners: Array<(changes: Record<string, any>, area: string) => void> = [];
  const alarmListeners: Array<(alarm: any) => void> = [];
  const messageListeners: Array<
    (message: any, sender: any, sendResponse: (res: any) => void) => boolean | void
  > = [];

  const mockChrome = {
    storage: {
      local: {
        get: vi.fn(async (keys?: string | string[] | null) => {
          if (!keys) return { ...store };
          if (typeof keys === 'string') {
            return { [keys]: store[keys] };
          }
          const result: Record<string, any> = {};
          keys.forEach((k) => {
            result[k] = store[k];
          });
          return result;
        }),
        set: vi.fn(async (items: Record<string, any>) => {
          const changes: Record<string, any> = {};
          for (const key of Object.keys(items)) {
            changes[key] = { oldValue: store[key], newValue: items[key] };
            store[key] = items[key];
          }
          storageListeners.forEach((listener) => listener(changes, 'local'));
        }),
        clear: vi.fn(async () => {
          Object.keys(store).forEach((k) => delete store[k]);
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
      openOptionsPage: vi.fn(),
      getURL: vi.fn((path: string) => `chrome-extension://mock-focusflow-extension-id${path}`),
      sendMessage: vi.fn(async (msg: any) => {
        return { success: true, data: msg };
      }),
      onMessage: {
        addListener: vi.fn((fn) => messageListeners.push(fn))
      },
      onInstalled: {
        addListener: vi.fn()
      },
      onStartup: {
        addListener: vi.fn()
      }
    }
  };

  (globalThis as any).chrome = mockChrome;
  return mockChrome;
}
