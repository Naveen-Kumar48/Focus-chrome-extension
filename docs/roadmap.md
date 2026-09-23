# FocusFlow 30-Phase Implementation Roadmap

This document establishes the authoritative execution plan for FocusFlow across all 30 phases. Each phase contains strict prerequisites, specific deliverables, required automated test suites, and concrete exit criteria.

---

## Phase Matrix Overview

```text
Foundations & Extension Core (Phases 0–14)
├── Phase 0: Architecture & Foundation (Current)
├── Phase 1: Extension Shell (React, TS, Vite, MV3, Popup, Options, Service Worker)
├── Phase 2: Focus Timer Engine (Resilient timestamp-based timer)
├── Phase 3: Website Management (Normalized blocklist manager)
├── Phase 4: Website Blocking Engine (Declarative Net Request dynamic rules)
├── Phase 5: Allow List Engine (Priority rules, subdomain exceptions)
├── Phase 6: Focus Profiles (Study, Work, Coding, Deep Work presets & custom)
├── Phase 7: Pomodoro Mode (4-cycle intervals, short/long breaks, auto-advance)
├── Phase 8: Session History (Completed sessions, local tracking)
├── Phase 9: Distraction Tracking (Blocked attempt counters, domain stats)
├── Phase 10: Scheduling Engine (Recurring calendar triggers, alarms)
├── Phase 11: Settings & UX Polish (Themes, sounds, strict mode, data export)
├── Phase 12: Accessibility (WCAG 2.1 AA, keyboard navigation, screen reader support)
├── Phase 13: Performance Audit (Sub-80ms popup mount, memory footprint, bundle size)
└── Phase 14: Security & Privacy Audit (CSP audit, permission audit, zero-leak check)

Cloud Platform & SaaS Scaling (Phases 15–22)
├── Phase 15: Cloud Backend API (Node.js, Express, TypeScript, Prisma, PostgreSQL)
├── Phase 16: User Authentication (Secure JWT, bcrypt, registration, login)
├── Phase 17: Extension Account Sync (Local-to-cloud bidirectional sync, offline support)
├── Phase 18: Web Dashboard (Next.js App Router, Tailwind, interactive charts)
├── Phase 19: Goals & Streaks (Daily/weekly targets, streaks, motivational milestones)
├── Phase 20: Monetization Model (Free vs Pro tiers, feature flag abstraction)
├── Phase 21: Payment Integration (Stripe checkout & webhook verification)
└── Phase 22: AI Productivity Features (Smart focus planner & weekly summaries)

Verification, Store Submission & Final QA (Phases 23–30)
├── Phase 23: Complete Test Suite (Unit, integration, E2E regression suite)
├── Phase 24: Production Build Verification (Zero type errors, zero lint warnings)
├── Phase 25: Chrome Web Store Submission Kit (Manifest, copy, privacy declarations)
├── Phase 26: Chrome Web Store Publishing Guide (Step-by-step developer instructions)
├── Phase 27: Microsoft Edge Add-ons Kit (Edge store package & documentation)
├── Phase 28: Store Assets & Creative Collateral (Icons, promo tiles, screenshot mockups)
├── Phase 29: Final Production QA Pass (Exhaustive end-to-end user journey verification)
└── Phase 30: Final Project Audit (Code cleanup, dead-code removal, final delivery report)
```

---

## Detailed Phase Breakdown

### Phase 0 — Product and Architecture Foundation
- **Deliverables**: Complete architecture documentation suite in `docs/`: `architecture.md`, `extension-architecture.md`, `security.md`, `testing.md`, `chrome-store.md`, `edge-store.md`, `roadmap.md`.
- **Validation**: Strict architectural review against MV3 specifications, permission justifications, and data contracts.
- **Exit Criteria**: 100% of architectural documentation complete and approved.

### Phase 1 — Extension Shell
- **Deliverables**: Root workspace configuration, `apps/extension`, React 18/19, TypeScript strict mode, Vite multi-page bundler, Manifest V3 manifest, background service worker, basic popup UI (`25:00`, `Start Focus`, `Today's Focus: 0 min`), options page, and extension icons.
- **Validation**: `pnpm run build`, load unpacked extension in Chrome, verify popup opens without console or service worker errors.

### Phase 2 — Focus Timer Engine
- **Deliverables**: Timestamp-based timer engine (`startedAt`, `duration`, `pausedAt`, `accumulatedPausedMs`, `targetEndTime`), `chrome.alarms` scheduler, Start / Pause / Resume / Stop / Reset controls, and presets (15, 25, 45, 60, 90 min, custom).
- **Validation**: Automated unit tests for elapsed time math, pause drift compensation, sleep simulation, and browser restart resilience.

### Phase 3 — Website Management
- **Deliverables**: Domain normalization utility, duplicate prevention, domain validation regex, add/edit/remove domain UI in Options page and Popup.
- **Validation**: Unit tests covering 15+ domain permutations (protocols, subdomains, ports, query strings, invalid formats).

### Phase 4 — Website Blocking Engine
- **Deliverables**: `declarativeNetRequest` dynamic rule generator, redirection to `blocked.html`, custom distraction-free focus splash screen with live countdown timer and motivational quote.
- **Validation**: Dynamic rule creation and teardown verification; tab redirection testing on blocked domains.

### Phase 5 — Allow List
- **Deliverables**: Allowlist rule compiler with higher priority (`priority: 2`) than blocklist rules (`priority: 1`), subdomain exception handling (e.g. allow `music.youtube.com` while blocking `youtube.com`).
- **Validation**: Deterministic conflict tests between allowlist and blocklist rules.

### Phase 6 — Focus Profiles
- **Deliverables**: Profile manager (Study, Coding, Work, Deep Work presets + custom user profiles), profile-specific block/allow lists and default durations, active profile switcher in Popup.
- **Validation**: Profile CRUD unit tests, active profile switching persistence in `chrome.storage.local`.

### Phase 7 — Pomodoro Mode
- **Deliverables**: Pomodoro state machine (25m Focus -> 5m Short Break x 4 cycles -> 15m Long Break), auto-start settings for breaks and focus periods, audio chime triggers.
- **Validation**: Cycle transition unit tests and audio playback mock checks.

### Phase 8 — Session History
- **Deliverables**: Session persistence schema (`CompletedSessionRecord`), tracking start/end times, actual duration, completion status, and interruption reasons.
- **Validation**: Session recording tests, aggregation tests for daily focus time and completed vs interrupted counts.

### Phase 9 — Distraction Tracking
- **Deliverables**: Distraction attempt logger from `blocked.html` to background worker, recording `{ domain, timestamp, sessionId }`, top distracted domains summary view.
- **Validation**: Verify zero tracking of full URLs or query strings; unit tests for domain counter aggregation.

### Phase 10 — Scheduling Engine
- **Deliverables**: Recurring schedule manager (e.g. Mon-Fri 09:00-12:00 Coding), background alarm poller checking schedule windows, schedule collision detection.
- **Validation**: Timezone handling tests, schedule activation and deactivation unit tests.

### Phase 11 — Settings and UX Polish
- **Deliverables**: Dark / Light / System theme engine, sound effects selector and volume slider, desktop notifications toggle, strict mode challenge modal, data export to JSON, data wipe button.
- **Validation**: Theme persistence checks, settings serialization tests, data export integrity checks.

### Phase 12 — Accessibility
- **Deliverables**: Full keyboard navigation (`Tab`, `Enter`, `Escape`), ARIA roles and labels on all interactive elements, visible focus indicators, contrast ratio >= 4.5:1, `prefers-reduced-motion` media queries.
- **Validation**: Automated axe accessibility scans and keyboard navigation audits.

### Phase 13 — Performance Audit
- **Deliverables**: Optimization of popup mounting (< 80ms), removal of unnecessary re-renders via `useCallback` and `memo`, bundle chunk splitting, event-driven background worker.
- **Validation**: Lighthouse audit, bundle size analysis (< 500KB gzipped).

### Phase 14 — Security & Privacy Audit
- **Deliverables**: Content Security Policy audit, zero client-side secrets verification, input sanitization verification, privacy policy documentation in `docs/privacy.md`.
- **Validation**: Static analysis scanning for hardcoded secrets, CSP conformance check.

### Phase 15 — Backend Foundation
- **Deliverables**: `apps/api` with Node.js, Express, TypeScript, Prisma ORM, PostgreSQL schema (`User`, `Profile`, `FocusSession`, `DistractionEvent`, `Subscription`), error handling and rate-limiting middleware.
- **Validation**: Database migration tests, API health check endpoint tests.

### Phase 16 — User Authentication
- **Deliverables**: Registration, login, logout, password hashing with `bcrypt`, JWT access and refresh token rotation, auth middleware.
- **Validation**: Auth integration tests (successful login, invalid credentials, expired token rejection).

### Phase 17 — Extension Account Sync
- **Deliverables**: Extension sync client (`src/services/sync.ts`), bidirectional synchronization of profiles, settings, and session history with conflict resolution (Last-Write-Wins), offline queuing.
- **Validation**: Offline-to-online sync simulation tests, retry exponential backoff tests.

### Phase 18 — Web Dashboard
- **Deliverables**: `apps/web` with Next.js App Router, Tailwind CSS, authenticated dashboard pages: `/dashboard`, `/sessions`, `/analytics`, `/profiles`, `/settings`.
- **Validation**: Next.js production build, dashboard component tests with mock data.

### Phase 19 — Goals & Streaks
- **Deliverables**: Daily and weekly focus hour goals with visual progress bars, consecutive day streak calculator, streak repair rules, optional toggle to disable streaks.
- **Validation**: Streak calculation algorithm unit tests across leap years and daylight saving transitions.

### Phase 20 — Monetization Model
- **Deliverables**: Free vs Pro tier feature gating (unlimited profiles, cloud sync, advanced analytics behind Pro), client feature flag hook, server-side subscription verification.
- **Validation**: Ensure client cannot bypass Pro features; verify backend authorization checks.

### Phase 21 — Payment Integration
- **Deliverables**: Stripe Checkout session creation, Stripe customer portal integration, verified server-side webhook listener (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`).
- **Validation**: Mocked Stripe webhook signature verification tests, subscription activation and downgrade tests.

### Phase 22 — AI Productivity Features
- **Deliverables**: Privacy-safe AI focus planner (suggests daily schedule based on available hours) and weekly summary generator using local aggregated metrics; zero raw browsing data transmitted.
- **Validation**: Payload sanitization checks prior to external AI prompt invocation.

### Phase 23 — Complete Testing Suite
- **Deliverables**: Full regression suite spanning unit, component, API integration, and Playwright Chromium E2E tests.
- **Validation**: 100% passing test suite across all packages and apps.

### Phase 24 — Production Build
- **Deliverables**: Production builds of `apps/extension`, `apps/web`, and `apps/api`.
- **Validation**: Strict TypeScript validation (`tsc --noEmit`), ESLint clean run, zero console errors, zero secret leaks.

### Phase 25 — Chrome Web Store Preparation
- **Deliverables**: `docs/chrome-store-submission.md` with finalized copy, permission justifications, single-purpose statement, privacy questionnaire answers.
- **Validation**: Automated manifest validator checking icon paths, permissions, and MV3 structure.

### Phase 26 — Chrome Web Store Publishing Guide
- **Deliverables**: Step-by-step developer manual with official URLs, registration instructions, ZIP upload, and review management guide.

### Phase 27 — Microsoft Edge Add-ons
- **Deliverables**: Edge store package configuration and `docs/edge-store-submission.md`.

### Phase 28 — Store Assets
- **Deliverables**: Production asset suite in `store-assets/`: icons (16, 32, 48, 128, 300px), screenshots (1280x800), promo tiles (440x280, 1400x560).

### Phase 29 — Final QA
- **Deliverables**: Full matrix testing across browser restarts, sleep/wake, edge-case domains, sound alerts, theme switches, and payment lifecycles.

### Phase 30 — Final Project Audit
- **Deliverables**: Repository audit, removal of dead code, final status verification report with commands, environment templates, and architectural handoff.
