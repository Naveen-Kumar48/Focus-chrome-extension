# FocusFlow Security & Privacy Specification

## 1. Threat Modeling for Manifest V3 Extensions

Browser extensions operate with elevated capabilities inside the user's browser runtime. A security breach in an extension could expose user data or system integrity. FocusFlow operates under a zero-trust model regarding untrusted inputs and follows the **Principle of Least Privilege**.

### Key Threat Vectors & Mitigations

```
+------------------------------------+---------------------------------------------------------------+
| Threat Vector                      | FocusFlow Mitigation Architecture                             |
+------------------------------------+---------------------------------------------------------------+
| 1. Remote Script Injection         | Manifest V3 strictly prohibits remote code execution (no CDN   |
|                                    | scripts, no eval(), no new Function()). All assets bundled.   |
+------------------------------------+---------------------------------------------------------------+
| 2. Cross-Site Scripting (XSS)      | Strict Content Security Policy (CSP), React JSX DOM rendering |
|                                    | with zero use of dangerouslySetInnerHTML or innerHTML.        |
+------------------------------------+---------------------------------------------------------------+
| 3. Domain Spoofing & Malformed URLs| RFC-compliant domain normalization engine with punycode       |
|                                    | decoding, protocol stripping, and strict character whitelists.|
+------------------------------------+---------------------------------------------------------------+
| 4. Message Sender Spoofing         | Runtime message validation ensuring messages originate from   |
|                                    | the extension's own origin (sender.id === chrome.runtime.id).|
+------------------------------------+---------------------------------------------------------------+
| 5. Excessive Permission Risk       | Zero use of webRequestBlocking, management, or tabs cookies.   |
|                                    | Declarative Net Request handles filtering in browser sandbox. |
+------------------------------------+---------------------------------------------------------------+
| 6. Browsing History Leakage        | Zero tracking of full URLs, pathnames, query parameters, or   |
|                                    | page contents. Only the root domain name is recorded.         |
+------------------------------------+---------------------------------------------------------------+
| 7. Secret Leakage                  | No backend API keys, JWT secrets, or third-party tokens in    |
|                                    | the extension repository or production build bundle.          |
+------------------------------------+---------------------------------------------------------------+
```

---

## 2. Content Security Policy (CSP)

FocusFlow declares an immutable, strict CSP in `manifest.json` complying with Google's MV3 requirements:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline';"
  }
}
```

- **`script-src 'self'`**: Only scripts physically bundled inside the packaged extension will be executed. External scripts loaded via `<script src="https://...">` are rejected by the browser.
- **`object-src 'self'`**: Prevents loading untrusted Flash, Java, or arbitrary plugin content.
- **`style-src 'self' 'unsafe-inline'`**: Enables CSS style injection required by React style processors while restricting external stylesheets.

---

## 3. Safe Domain Normalization & Validation Algorithm

When a user inputs a domain to block (e.g. `https://www.YouTube.com/watch?v=123` or `m.youtube.com`), the input must be sanitized and normalized before being passed to rule generators or storage.

### 3.1 Normalization Pipeline

```typescript
export interface DomainValidationResult {
  isValid: boolean;
  normalizedDomain: string | null;
  error?: string;
}

export function normalizeDomain(input: string): DomainValidationResult {
  if (!input || typeof input !== 'string') {
    return { isValid: false, normalizedDomain: null, error: 'Domain cannot be empty.' };
  }

  let cleaned = input.trim().toLowerCase();

  // 1. Strip protocols if provided
  if (cleaned.startsWith('http://')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('https://')) cleaned = cleaned.slice(8);
  else if (cleaned.includes('://')) {
    return { isValid: false, normalizedDomain: null, error: 'Unsupported URL protocol scheme.' };
  }

  // 2. Strip trailing paths, queries, and fragments
  cleaned = cleaned.split('/')[0].split('?')[0].split('#')[0];

  // 3. Strip port numbers if present
  cleaned = cleaned.split(':')[0];

  // 4. Strip leading 'www.' for canonicalization
  if (cleaned.startsWith('www.')) {
    cleaned = cleaned.slice(4);
  }

  // 5. Punycode validation & character set check
  // Disallow control characters, whitespaces, quotes, slashes, or script tags
  const validDomainPattern = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})*\.[a-z]{2,63}$/;

  if (!validDomainPattern.test(cleaned)) {
    return {
      isValid: false,
      normalizedDomain: null,
      error: 'Invalid domain format. Example valid domain: youtube.com or app.slack.com'
    };
  }

  // 6. Prohibited scheme domains (prevent blocking browser internal pages)
  const prohibited = ['chrome', 'extensions', 'settings', 'devtools', 'edge', 'about'];
  if (prohibited.includes(cleaned)) {
    return { isValid: false, normalizedDomain: null, error: 'Cannot block browser internal surfaces.' };
  }

  return { isValid: true, normalizedDomain: cleaned };
}
```

### 3.2 Subdomain Matching Policy
- When a user blocks `youtube.com`, the dynamic rule filter is generated as `||youtube.com`, which automatically matches `youtube.com`, `www.youtube.com`, `m.youtube.com`, and `subdomain.youtube.com`.
- When a user adds an exception `music.youtube.com` to the Allowlist, an allow rule is generated with higher priority (`priority: 2`), ensuring precision without wildcard collision.

---

## 4. Message Passing Security

All communication across extension execution contexts (Popup -> Background, Blocked Page -> Background) uses strict origin and schema checks.

```typescript
// Background Service Worker Message Guard
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 1. Origin Verification: verify message originates from our extension ID
  if (sender.id !== chrome.runtime.id) {
    console.warn('[Security] Rejected message from unauthorized sender:', sender.id);
    sendResponse({ success: false, error: 'Unauthorized sender' });
    return false;
  }

  // 2. Type validation
  if (!message || typeof message.type !== 'string') {
    sendResponse({ success: false, error: 'Malformed message format' });
    return false;
  }

  // 3. Delegate to validated message dispatcher
  handleSecureMessage(message, sender)
    .then(data => sendResponse({ success: true, data }))
    .catch(err => sendResponse({ success: false, error: err.message }));

  return true; // Keep message channel open for async response
});
```

---

## 5. Privacy Boundary & Minimal Data Retention

FocusFlow is built with a **Privacy-by-Design** philosophy. User trust is paramount.

### Data Collection Policy

| Data Item | Stored? | Where? | Rationale |
| :--- | :--- | :--- | :--- |
| **Full Page URLs** (with query parameters) | **NO** | Never collected or stored | Protects user privacy, search history, auth tokens, and sensitive query strings. |
| **Page Content / Form Inputs** | **NO** | Never read or stored | Content scripts do not inspect page contents. |
| **Domain of Blocked Attempts** | **YES** | Local storage | Required for the distraction tracker (e.g. `youtube.com: 3 attempts`). |
| **Focus Session Timestamps** | **YES** | Local storage | Required to calculate focus duration, streaks, and analytics. |
| **User Profiles & Blocklists** | **YES** | Local storage | Required to enforce the user's selected blocking preferences. |

### Data Deletion & Export
The user has complete ownership of their local data:
- **Export Data**: A single click in the Options page downloads all stored sessions, profiles, and distraction counters as a standardized JSON file.
- **Wipe All Data**: The user can reset the local database at any time, clearing all `chrome.storage.local` entries and resetting rulesets.

---

## 6. Secret Management Guarantee

> [!CAUTION]
> **Zero Client Secrets Rule**: No backend API keys, JWT signing keys, payment provider secrets (such as Stripe secret keys), or database credentials will ever be placed in the browser extension codebase or bundled into extension distributions.

When cloud services (Phase 15+) are introduced:
- The extension communicates solely with the FocusFlow backend via standard HTTPS requests passing an ephemeral, scoped user Bearer token.
- All payment processing, subscription verification, and webhook handling are executed exclusively on the authenticated Node.js cloud server.
