# Microsoft Edge Add-ons Submission & Compatibility Guide

## 1. Chromium Parity & Manifest V3 Compatibility

Microsoft Edge is powered by the open-source Chromium engine, ensuring near-total parity with Google Chrome extension APIs. FocusFlow is intentionally engineered as a cross-browser extension that runs natively on both Google Chrome and Microsoft Edge without codebase divergence.

### API Compatibility Audit

| Chrome API | Microsoft Edge Status | FocusFlow Usage |
| :--- | :--- | :--- |
| `chrome.storage.local` | Fully Supported | State persistence for profiles, timer, and settings |
| `chrome.alarms` | Fully Supported | Service worker wakeups and schedule polling |
| `chrome.declarativeNetRequest` | Fully Supported (Edge 91+) | Dynamic website blocking and redirection to `blocked.html` |
| `chrome.notifications` | Fully Supported | Desktop alerts on session completion |
| `chrome.runtime` | Fully Supported | Typed messaging between popup and background worker |

*Note: Microsoft Edge supports the standard `chrome.*` namespace as well as the `browser.*` namespace. FocusFlow uses standard `chrome.*` APIs, guaranteeing 100% interoperability across both browsers.*

---

## 2. Microsoft Partner Center Requirements

To publish FocusFlow on the Microsoft Edge Add-ons catalog:

1. **Developer Account**:
   - Register at the [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview).
   - Sign in with a Microsoft account and enroll in the Microsoft Edge Developer Program (free enrollment; no annual subscription fee).
2. **Identity Verification**:
   - Complete individual or corporate identity verification in the Partner Center account settings.
3. **Certification Policies**:
   - Compliance with the [Microsoft Edge Extension Policies](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/edge-addon-developer-policies):
     - Single purpose clarity.
     - Performance impact minimization (no excessive background battery drain).
     - Accurate functional descriptions.
     - Clear and accessible privacy policy URL.

---

## 3. Package & Asset Specifications

### 3.1 Extension Package
- **Format**: Standard `.zip` archive containing the production build of `apps/extension/dist`.
- **Manifest Requirements**:
  - `manifest_version: 3`.
  - All icons referenced in manifest must be physically present in the package root or subdirectories.
  - No hidden or obfuscated JavaScript code (TypeScript output must be clean, readable ES modules).

### 3.2 Visual Assets for Microsoft Edge Add-ons

| Asset | Dimensions | Format | Requirement |
| :--- | :--- | :--- | :--- |
| **Extension Store Logo** | 300x300 px | PNG (Square) | Mandatory. Displayed on the Edge Add-ons product page. |
| **Small Promotional Tile** | 440x280 px | PNG / JPEG | Optional but strongly recommended for search placement. |
| **Large Promotional Tile** | 1400x560 px | PNG / JPEG | Optional; required to be featured on curated collections. |
| **Screenshots (1 to 10)** | 1280x800 or 1366x768 px | PNG / JPEG | Mandatory (at least 1, recommended 4+). 16:10 or 16:9 ratio. |

---

## 4. Submission Workflow

```
[Production Build] -> [ZIP Archive] -> [Partner Center Upload] -> [Automated Scans] -> [Human Certification] -> [Published]
```

### Step-by-Step Instructions:

1. **Package the Extension**:
   ```bash
   pnpm run build:extension
   pnpm run package:extension
   # Generates: store-assets/edge/focusflow-edge-vX.Y.Z.zip
   ```
2. **Create New Submission**:
   - Navigate to Microsoft Partner Center > **Developer Dashboard** > **Microsoft Edge**.
   - Click **Create new extension** and upload the generated `.zip` package.
3. **Provide Extension Details**:
   - **Extension Name**: `FocusFlow — Focus Timer & Website Blocker`.
   - **Base Language**: English (United States).
   - **Category**: `Productivity`.
   - **Short Description**: Enter the 132-character summary.
   - **Detailed Description**: Paste the verified markdown product description.
4. **Upload Visual Assets**:
   - Upload the 300x300 store logo and screenshots illustrating the timer, blocker, and analytics views.
5. **Declare Privacy & Permissions**:
   - Provide the public HTTPS URL for the FocusFlow Privacy Policy.
   - Enter justification for `declarativeNetRequest` and `host_permissions` ("Required to redirect user-designated distracting websites to the local focus screen during active sessions").
6. **Submit for Certification**:
   - Review timeline: Typically 24 to 72 business hours.
   - Once certified, the extension automatically becomes available on the Microsoft Edge Add-ons store.
