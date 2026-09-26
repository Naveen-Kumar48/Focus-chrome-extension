# Microsoft Edge Add-ons Store — Submission Metadata & Details

Use these exact copy-paste values when filling out your submission on the [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview).

---

## 1. Store Listing Details

### Product Name
```text
FocusFlow — Focus Timer & Website Blocker
```

### Short Description (Max 132 characters)
```text
Boost your productivity with custom focus timers, smart website blocking, distraction shields, and daily productivity analytics.
```
*(Character count: 127/132)*

### Category
```text
Productivity
```

### Full Description
```markdown
# FocusFlow — Master Your Focus & Eliminate Distractions

FocusFlow is a modern, privacy-first productivity platform engineered to shield your attention from online distractions. Whether you are coding, studying, or doing deep creative work, FocusFlow provides the essential tools to keep you in flow state.

### 🚀 Key Features

* **Smart Website Blocker**: Block distracting websites (YouTube, Reddit, Instagram, Twitter/X, Facebook, and custom URLs) with instant zero-overhead redirection.
* **Flexible Focus Timer**: Choose from classic presets (15m, 25m Pomodoro, 45m Deep Work, 60m, 90m) or customize your own session length down to the minute.
* **Live Toolbar Badge**: Real-time minute countdown directly on the extension icon in your browser toolbar so you always know your remaining focus time.
* **Distraction Splash Screen**: Gentle, motivational intercept screen displaying the remaining session time and an encouraging quote whenever you attempt to open a blocked domain.
* **Productivity Analytics**: Track completed sessions, total focused hours, and blocked distraction attempts for today and the past 7 days.
* **Custom Profiles**: Create and switch between Work, Study, and Coding blocking lists tailored to your workflow.
* **Chime Notifications & Audio Feedback**: Subtle ambient audio cues powered by the Web Audio API when sessions complete.
* **100% Offline & Private**: All your data and settings stay locally in your browser. No telemetry, no external ad trackers, no third-party data collection.

### 🛡️ Privacy Guarantee
FocusFlow runs entirely within your browser using modern Manifest V3 architecture. Your browsing history is never tracked, stored, or sent to any remote servers.

Empower your workday and take back control of your attention with FocusFlow.
```

---

## 2. Store Package & Assets

* **Package File**: `store-assets/edge/focusflow-edge-v1.1.0.zip`
* **Store Logo (300x300 PNG)**: `store-assets/edge/store-logo-300.png`
* **Version**: `1.1.0`
* **Manifest Version**: `3`

---

## 3. Justification for Certification Team (Permission Declaration)

Copy and paste these declarations into the **Certification notes** / **Permissions justification** box in Partner Center:

### `declarativeNetRequest`
> "Used strictly to redirect distracting websites designated by the user (such as social media and entertainment domains) to the local focus splash page (blocked.html) exclusively while a focus session is active. Dynamic rules are cleanly uninstalled when the session finishes or is paused."

### `host_permissions: ["*://*/*"]`
> "Required so that users can add any custom website URL or domain of their choice to their focus blocklist and have declarativeNetRequest apply blocking rules to those domains."

### `storage`
> "Used to persist user focus profiles, custom website blocklists, timer state across browser restarts, and local productivity analytics."

### `alarms`
> "Used to wake the Manifest V3 service worker when a focus session timer elapses, ensuring timely badge updates and chime notifications even if the popup window is closed."

---

## 4. Notes for Certification Testers (How to test)

```text
Test Instructions for Certification Team:
1. Click the FocusFlow icon in the browser toolbar to open the popup.
2. Select any timer preset (e.g. 25m) and click "Start Focus Session".
3. Notice the toolbar badge displaying the remaining session minutes.
4. Try navigating to "youtube.com" or "reddit.com" in a new tab. Notice that the page is safely redirected to the extension's local motivational focus screen (blocked.html).
5. Click "Open Focus Dashboard" (or right-click extension icon > Options) to view the website management page and add/remove custom domains.
6. Click "End Session" in the popup to deactivate blocking. Verify that normal browsing resumes immediately.
```
