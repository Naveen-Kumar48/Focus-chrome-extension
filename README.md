# FocusFlow — Focus Timer & Website Blocker

A production-ready Chrome/Edge extension for deep work. Block distracting websites, run Pomodoro or custom focus timers, and track your productivity — all locally, with zero cloud dependency.

---

## Features

- **Focus Timer** — Timestamp-based timer with Start / Pause / Resume / Stop / Reset and presets (15, 25, 45, 60, 90 min)
- **Website Blocker** — `declarativeNetRequest` dynamic rules redirect blocked domains to a custom splash page
- **Active Tab Auto-Purge (v1.1.0)** — Instantly detects and redirects pre-existing open tabs on blocked websites when focus starts
- **Strict Mode Enforcement (v1.1.0)** — Prevents impulse quitting with a typing verification challenge and locks blocklist modification during focus
- **1-Click Quick Block & Shortcuts (v1.1.0)** — Single-click "Block This Site" button in popup + global keyboard shortcuts (`Alt+Shift+F` and `Alt+Shift+B`)
- **Offscreen Audio Chimes (v1.1.0)** — Manifest V3 compliant Web Audio API synthesizer for session completion and break alerts
- **Incognito Shield (v1.1.0)** — Spanning incognito support and automatic warning when private browsing is unprotected
- **Focus Profiles** — Study, Work, Coding, Deep Work presets + custom profiles with per-profile block/allow lists
- **Pomodoro Mode** — 4-cycle state machine (25m focus → 5m break × 4 → 15m long break)
- **Session History** — Tracks completed and interrupted sessions with actual vs scheduled durations
- **Distraction Tracking** — Logs blocked domain attempts per session
- **Settings & Data Management** — Audio chimes toggle, Strict Mode toggle, JSON data export, and local database wipe
- **Privacy-first** — No remote servers, no browsing data collected, fully local `chrome.storage.local`

---

## What's New in Version 1.1.0

| Feature | Category | Description |
|---|---|---|
| **Active Tab Auto-Purge** | Security / Anti-Bypass | Closes the open tab loophole by immediately redirecting already-open distracting tabs when a session starts. |
| **Strict Mode Challenge** | Productivity / Anti-Bypass | Requires typing an explicit commitment phrase to end or pause an active focus session early. |
| **Blocklist Lock** | Security | Blocks removing domains or deleting profiles in Options while a Strict Mode session is running. |
| **Offscreen Audio Engine** | UX / Architecture | Implements a dedicated `chrome.offscreen` document to play crystal-clear audio chimes in MV3 service workers. |
| **1-Click Quick Block** | UX / Productivity | Adds a quick-action pill in the popup to block the active website without opening Options. |
| **Global Keyboard Shortcuts** | UX / Accessibility | `Alt+Shift+F` (Start/Pause Timer) and `Alt+Shift+B` (Block Current Tab). |
| **Incognito Mode Shield** | Security / Anti-Bypass | Manifest declared with `"incognito": "spanning"` and detection banner guiding users to protect private windows. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension | React 18, TypeScript, Vite (MV3) |
| Shared types | `@focusflow/shared` (internal package) |
| Testing | Vitest (unit & integration), Playwright (E2E) |
| Audio Engine | Web Audio API via `chrome.offscreen` |
| Network Filtering | Chrome/Edge `declarativeNetRequest` (DNR) |
| Monorepo | npm workspaces |

---

## Project Structure

```
focusflow/
├── apps/
│   └── extension/          # Chrome/Edge MV3 extension
│       ├── src/
│       │   ├── background/ # Service worker, timer reconciliation, shortcuts, message handler
│       │   ├── blocked/    # Focus shield splash screen UI
│       │   ├── offscreen/  # Web Audio API playback engine for MV3
│       │   ├── popup/      # React popup UI (timer, presets, quick block, strict challenge)
│       │   ├── options/    # React options page (domains, profiles, strict mode, backup)
│       │   ├── services/   # Timer, DNR blocker, audio, and analytics engines
│       │   └── storage/    # Typed chrome.storage.local wrapper
│       └── public/
│           ├── manifest.json
│           └── icons/
├── packages/
│   └── shared/             # Shared TypeScript types and constants
├── store-assets/           # Edge and Chrome Store distribution packages & logos
│   ├── edge/               # Edge Add-ons ZIP package, logo 300x300, and metadata
│   └── chrome/             # Chrome Web Store ZIP package and checksums
├── scripts/                # Packaging and release automation scripts
├── tests/
│   ├── e2e/                # Playwright extension tests
│   └── mocks/              # Chrome API mocks (storage, alarms, tabs, offscreen, DNR)
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

Vite builds in watch mode to `apps/extension/dist/`. Load that folder as an unpacked extension at `chrome://extensions` or `edge://extensions`.

### Build

```bash
npm run build
```

### Type Check

```bash
npm run typecheck
```

### Unit Tests

```bash
npm test
```

### Package for Edge & Chrome Web Store

```bash
npm run package:extension
```
Generates production `.zip` packages with SHA-256 checksums in:
- `store-assets/edge/focusflow-edge-v1.1.0.zip`
- `store-assets/chrome/focusflow-chrome-v1.1.0.zip`

---

## Permissions

| Permission | Reason |
|---|---|
| `storage` | Persist timer state, profiles, sessions, and settings locally |
| `alarms` | Wake the MV3 service worker to check timer expiry and schedules |
| `declarativeNetRequest` | Block websites at the network layer without inspecting browsing traffic |
| `tabs` | Query and redirect active tabs on blocked domains when focus starts |
| `offscreen` | Play audio chimes via Web Audio API in compliance with MV3 service worker rules |
| `notifications` | Desktop alert when a focus session completes |

No `webRequest`, `cookies`, or arbitrary remote code execution permissions are used. Fully compliant with Chrome and Edge Store policies.

---

## Roadmap

The project follows a 30-phase plan:

- **Phases 0–14** — Extension core (timer, blocker, tab purge, strict mode, profiles, Pomodoro, analytics, accessibility)
- **Phases 15–22** — Cloud backend, auth, sync, web dashboard, Stripe payments, AI features
- **Phases 23–30** — Full test suite, production builds, Chrome & Edge store submission

See [`docs/roadmap.md`](docs/roadmap.md) for the full breakdown.

---

## Docs

- [`docs/edge-store.md`](docs/edge-store.md) — Microsoft Edge Add-ons submission & update guide
- [`docs/chrome-store.md`](docs/chrome-store.md) — Chrome Web Store submission guide
- [`docs/architecture.md`](docs/architecture.md) — System design, storage schema, permission strategy
- [`docs/security.md`](docs/security.md) — CSP, privacy, threat model & anti-circumvention architecture
- [`docs/testing.md`](docs/testing.md) — Testing strategy and coverage requirements

---

## License

Private — all rights reserved.
