# Chrome Web Store Submission & Policy Compliance

## 1. Compliance with Chrome Web Store Developer Program Policies

The Chrome Web Store enforces strict developer guidelines to ensure user security, transparency, and high product quality. FocusFlow is engineered from the ground up to exceed all store criteria.

---

## 2. Single Purpose Policy Compliance

> **Policy Requirement**: An extension must have a single purpose that is clear to the user. Do not combine multiple unrelated features into one extension.

### FocusFlow Declaration:
**Single Purpose**: *Cultivate deep work and eliminate digital distractions by blocking user-selected websites during timed focus sessions.*

All integrated features directly serve this single purpose:
- **Focus Timer**: Governs the duration of the focus session.
- **Website Blocker**: Enforces distraction blocking during the active focus session.
- **Focus Profiles**: Allows switching blocked site groups based on the task (e.g. "Coding" vs "Writing").
- **Distraction Tracker & Analytics**: Informs the user of temptation frequencies to refine focus habits.

---

## 3. Comprehensive Permission Justifications

Chrome Web Store reviewers scrutinize every declared permission. FocusFlow declares only the minimum necessary permissions with explicit justifications.

### 3.1 `storage`
- **Feature Requiring It**: Profile configuration, active timer state, user settings, and completed session history.
- **Reviewer Justification**: FocusFlow operates local-first. The `storage` permission is required to save user-defined blocked websites, focus session durations, and user preferences locally within the browser sandbox without requiring remote database accounts.

### 3.2 `alarms`
- **Feature Requiring It**: Timer countdown completion, Pomodoro cycle progression, and recurring schedule triggers.
- **Reviewer Justification**: Under Manifest V3, background service workers suspend when idle. The `alarms` API is required to wake the service worker at the exact moment a focus session ends or a scheduled focus block begins, ensuring precise session tracking without keeping background processes continuously running.

### 3.3 `declarativeNetRequest`
- **Feature Requiring It**: Website blocking engine.
- **Reviewer Justification**: Required to dynamically block or redirect user-designated distracting websites during active focus sessions. Declarative Net Request operates at the browser network layer, ensuring zero access to page content, keystrokes, or user traffic, preserving optimal privacy and security.

### 3.4 `notifications`
- **Feature Requiring It**: Desktop alerts for timer completion and break periods.
- **Reviewer Justification**: Required to notify users with an audible and visual desktop alert when a focus session ends or a Pomodoro break starts, enabling users to step away from their browser without missing transition cues.

### 3.5 `host_permissions: ["*://*/*"]`
- **Feature Requiring It**: Main-frame redirection to the internal FocusFlow blocked splash screen (`blocked.html`).
- **Reviewer Justification**: Under Chrome Manifest V3 specifications, dynamic rules using `redirect` to an extension path (`extensionPath: "/blocked.html"`) require host permissions for the matched domains. Because users can customize and add any public distracting website (e.g. social media, streaming, forums) to their personal blocklist, host access is required to execute the redirect to the FocusFlow focus screen. FocusFlow never injects content scripts, modifies request headers, or reads response bodies via this permission.

---

## 4. Store Listing Assets & Specifications

| Asset | Dimensions | Format | Purpose |
| :--- | :--- | :--- | :--- |
| **Extension Icons** | 16x16, 32x32, 48x48, 128x128 | PNG-24 (Transparent) | Displayed in Chrome toolbar, extension manager, and store listings. |
| **Store Icon** | 128x128 | PNG-24 | Official store icon displayed on search results and product header. |
| **Small Promo Tile** | 440x280 | PNG / JPEG (No Alpha) | Shown on category pages and featured carousels. |
| **Marquee Promo Tile** | 1400x560 | PNG / JPEG (No Alpha) | Displayed in large store homepage hero banners. |
| **Screenshots (5)** | 1280x800 | PNG (16:10 aspect ratio) | Highlights key capabilities (Timer, Blocker, Profiles, Analytics, Schedules). |

---

## 5. Store Listing Copy

### Extension Name
`FocusFlow — Focus Timer & Website Blocker`

### Short Description (Limit: 132 Characters)
`Boost your productivity with smart website blocking, custom Pomodoro focus timers, distraction tracking, and focus profiles.` *(123 chars)*

### Category
`Productivity`

### Detailed Description (Markdown formatted for store editor)

```markdown
Reclaim your focus and conquer procrastination with FocusFlow.

FocusFlow is a modern, privacy-first productivity platform that pairs an intelligent website blocker with a high-precision focus timer. Whether studying, coding, or writing, FocusFlow eliminates online distractions so you can enter the flow state effortlessly.

KEY FEATURES

🎯 High-Precision Focus Timer
• Flexible sessions: 15, 25, 45, 60, or 90-minute presets, plus custom durations.
• Resilient design: Timers survive browser restarts, sleep mode, and closed popups.
• Built-in Pomodoro mode with automated short and long break cycles.

🛡️ Intelligent Website Blocking
• Block distracting websites (YouTube, Instagram, Reddit, Netflix, etc.) during focus sessions.
• Instant redirection to an inspiring, distraction-free focus screen.
• Granular allowlists: block an entire domain while allowing productive subdomains.

📁 Custom Focus Profiles
• Tailor your focus environment by activity: Study, Work, Coding, or Deep Work.
• Configure unique blocklists and durations for each profile.

📊 Distraction & Focus Analytics
• Track completed sessions, total focus hours, and streaks.
• Monitor distraction attempts to identify and conquer temptation triggers.
• 100% private: all analytics are calculated and stored locally on your device.

⏰ Automated Focus Scheduling
• Set recurring focus blocks (e.g. Monday–Friday 9:00 AM – 12:00 PM).
• Stay consistent with zero daily friction.

PRIVACY BY DESIGN
FocusFlow respects your privacy:
✓ Zero tracking of browsing history or search queries.
✓ Zero third-party ad trackers or analytics scripts.
✓ No account or sign-up required to use core features.
✓ Your blocklists and statistics remain securely on your device.

Upgrade your daily productivity today with FocusFlow!
```

---

## 6. Privacy Practices & Disclosure Declarations

In the Chrome Web Store Developer Dashboard under the **Privacy** tab:

1. **Single Purpose Certification**: Checked.
2. **User Data Declarations**:
   - `Personally Identifiable Information`: **Not Collected**.
   - `Health Information`: **Not Collected**.
   - `Financial and Payment Information`: **Not Collected** in the extension.
   - `Authentication Information`: **Not Collected** in MVP.
   - `Personal Communications`: **Not Collected**.
   - `Location`: **Not Collected**.
   - `Web History`: **Not Collected** (Only user-inputted blocklist domains are saved; general browsing history is never logged).
   - `User Activity`: **Local only** (focus session counts, local distraction counter).
3. **Data Usage Certification**:
   - FocusFlow does not sell user data to third parties.
   - FocusFlow does not use or transfer user data for purposes unrelated to the item's single purpose.
   - FocusFlow does not use or transfer user data to determine creditworthiness or for lending purposes.
