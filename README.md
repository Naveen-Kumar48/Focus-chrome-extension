# FocusFlow — Focus Timer & Website Blocker

A production-ready Chrome/Edge extension for deep work. Block distracting websites, run Pomodoro or custom focus timers, and track your productivity — all locally, with zero cloud dependency.

---

## Features

- **Focus Timer** — Timestamp-based timer with Start / Pause / Resume / Stop / Reset and presets (15, 25, 45, 60, 90 min)
- **Website Blocker** — `declarativeNetRequest` dynamic rules redirect blocked domains to a custom splash page
- **Focus Profiles** — Study, Work, Coding, Deep Work presets + custom profiles with per-profile block/allow lists
- **Pomodoro Mode** — 4-cycle state machine (25m focus → 5m break × 4 → 15m long break)
- **Session History** — Tracks completed and interrupted sessions with actual vs scheduled durations
- **Distraction Tracking** — Logs blocked domain attempts per session
- **Scheduling Engine** — Recurring focus windows (e.g. Mon–Fri 09:00–12:00)
- **Settings** — Dark/light/system theme, sounds, notifications, strict mode, data export/wipe
- **Privacy-first** — No remote servers, no browsing data collected, fully local `chrome.storage.local`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension | React 18, TypeScript, Vite (MV3) |
| Shared types | `@focusflow/shared` (internal package) |
| Testing | Vitest (unit), Playwright (E2E) |
| Linting | ESLint + TypeScript ESLint |
| Monorepo | npm workspaces |

---

## Project Structure

```
focusflow/
├── apps/
│   └── extension/          # Chrome/Edge MV3 extension
│       ├── src/
│       │   ├── background/ # Service worker, timer reconciliation, message handler
│       │   ├── popup/      # React popup UI
│       │   ├── options/    # React options page
│       │   └── storage/    # Typed chrome.storage.local wrapper
│       └── public/
│           ├── manifest.json
│           └── icons/
├── packages/
│   └── shared/             # Shared TypeScript types and constants
├── tests/
│   ├── e2e/                # Playwright extension tests
│   └── mocks/              # Chrome API mocks
└── docs/                   # Architecture, roadmap, security, store guides
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
npm install
```

### Development

```bash
npm run dev:extension
```

Vite builds in watch mode to `apps/extension/dist/`. Load that folder as an unpacked extension at `chrome://extensions`.

### Build

```bash
npm run build:extension
```

### Type Check

```bash
npm run typecheck
```

### Unit Tests

```bash
npm test
```

### E2E Tests

```bash
npm run test:e2e
```

---

## Loading the Extension in Chrome

1. Run `npm run build:extension`
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** → select `apps/extension/dist/`

---

## Permissions

| Permission | Reason |
|---|---|
| `storage` | Persist timer state, profiles, sessions, and settings locally |
| `alarms` | Wake the MV3 service worker to check timer expiry |
| `declarativeNetRequest` | Block websites at the network layer without inspecting traffic |
| `notifications` | Desktop alert when a focus session completes |

No `webRequest`, `cookies`, or script injection permissions are used.

---

## Roadmap

The project follows a 30-phase plan:

- **Phases 0–14** — Extension core (timer, blocker, profiles, Pomodoro, analytics, accessibility, security)
- **Phases 15–22** — Cloud backend, auth, sync, web dashboard, Stripe payments, AI features
- **Phases 23–30** — Full test suite, production builds, Chrome & Edge store submission

See [`docs/roadmap.md`](docs/roadmap.md) for the full breakdown.

---

## Docs

- [`docs/architecture.md`](docs/architecture.md) — System design, storage schema, permission strategy
- [`docs/security.md`](docs/security.md) — CSP, privacy, threat model
- [`docs/testing.md`](docs/testing.md) — Testing strategy and coverage requirements
- [`docs/chrome-store.md`](docs/chrome-store.md) — Chrome Web Store submission guide
- [`docs/edge-store.md`](docs/edge-store.md) — Microsoft Edge Add-ons guide

---

## License

Private — all rights reserved.
