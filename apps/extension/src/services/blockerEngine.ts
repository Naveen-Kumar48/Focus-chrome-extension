import { FocusProfile } from '@focusflow/shared';

// Rule ID allocation ranges
export const BLOCK_RULE_ID_BASE = 10000;
export const ALLOW_RULE_ID_BASE = 20000;

/**
 * Compiles DeclarativeNetRequest dynamic rules for a given focus profile.
 * Blocklist rules have priority 1 (redirect to /blocked.html?domain=...)
 * Allowlist rules have priority 2 (allow navigation, bypassing block rules)
 */
export function compileProfileDnrRules(profile: FocusProfile): chrome.declarativeNetRequest.Rule[] {
  const rules: chrome.declarativeNetRequest.Rule[] = [];

  // 1. Allowlist rules (Priority 2 - highest precedence)
  const allowed = profile.allowedDomains || [];
  allowed.forEach((domain, idx) => {
    const cleanDomain = domain.toLowerCase().trim();
    if (!cleanDomain) return;

    rules.push({
      id: ALLOW_RULE_ID_BASE + idx + 1,
      priority: 2,
      action: {
        type: 'allow' as chrome.declarativeNetRequest.RuleActionType
      },
      condition: {
        urlFilter: `||${cleanDomain}`,
        resourceTypes: ['main_frame' as chrome.declarativeNetRequest.ResourceType]
      }
    });
  });

  // 2. Blocklist rules (Priority 1)
  const blocked = profile.blockedDomains || [];
  blocked.forEach((domain, idx) => {
    const cleanDomain = domain.toLowerCase().trim();
    if (!cleanDomain) return;

    rules.push({
      id: BLOCK_RULE_ID_BASE + idx + 1,
      priority: 1,
      action: {
        type: 'redirect' as chrome.declarativeNetRequest.RuleActionType,
        redirect: {
          extensionPath: `/blocked.html?domain=${encodeURIComponent(cleanDomain)}`
        }
      },
      condition: {
        urlFilter: `||${cleanDomain}`,
        resourceTypes: ['main_frame' as chrome.declarativeNetRequest.ResourceType]
      }
    });
  });

  return rules;
}

/**
 * Activates website blocking rules in Chrome DNR for the active profile.
 */
export async function activateBlockingRules(profile: FocusProfile): Promise<void> {
  if (
    typeof chrome === 'undefined' ||
    !chrome.declarativeNetRequest ||
    !chrome.declarativeNetRequest.updateDynamicRules
  ) {
    return;
  }

  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existingRules.map((r) => r.id);
  const addRules = compileProfileDnrRules(profile);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules
  });

  console.log(`[FocusFlow DNR] Activated ${addRules.length} dynamic blocking rules.`);
}

/**
 * Deactivates all website blocking rules, immediately restoring web access.
 */
export async function deactivateBlockingRules(): Promise<void> {
  if (
    typeof chrome === 'undefined' ||
    !chrome.declarativeNetRequest ||
    !chrome.declarativeNetRequest.updateDynamicRules
  ) {
    return;
  }

  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existingRules.map((r) => r.id);

  if (removeRuleIds.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: []
    });
  }

  console.log(`[FocusFlow DNR] Cleared all dynamic blocking rules. Web access restored.`);
}

/**
 * Checks if a given URL string matches any blocked domain for the profile,
 * respecting allowlist exemptions.
 */
export function isUrlBlocked(
  url: string,
  blockedDomains: string[],
  allowedDomains: string[] = []
): boolean {
  if (!url || typeof url !== 'string') return false;

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();

    // 1. Allowlist has higher priority
    const isAllowed = allowedDomains.some((domain) => {
      const clean = domain.toLowerCase().trim();
      if (!clean) return false;
      return hostname === clean || hostname.endsWith(`.${clean}`);
    });
    if (isAllowed) return false;

    // 2. Blocklist check
    return blockedDomains.some((domain) => {
      const clean = domain.toLowerCase().trim();
      if (!clean) return false;
      return hostname === clean || hostname.endsWith(`.${clean}`);
    });
  } catch {
    return false;
  }
}

/**
 * Interrogates all open browser tabs and forcibly redirects any tab currently visiting
 * a blocked website to the FocusFlow blocked shield splash page.
 */
export async function purgeBlockedOpenTabs(profile: FocusProfile): Promise<number> {
  if (
    typeof chrome === 'undefined' ||
    !chrome.tabs ||
    !chrome.tabs.query ||
    !chrome.tabs.update
  ) {
    return 0;
  }

  try {
    const tabs = await chrome.tabs.query({});
    let redirectedCount = 0;

    for (const tab of tabs) {
      if (
        tab.id &&
        tab.url &&
        isUrlBlocked(tab.url, profile.blockedDomains, profile.allowedDomains)
      ) {
        try {
          const domain = new URL(tab.url).hostname;
          await chrome.tabs.update(tab.id, {
            url: chrome.runtime.getURL(`blocked.html?domain=${encodeURIComponent(domain)}`)
          });
          redirectedCount++;
        } catch (tabErr) {
          console.debug('[FocusFlow DNR] Could not redirect tab:', tab.id, tabErr);
        }
      }
    }

    if (redirectedCount > 0) {
      console.log(`[FocusFlow DNR] Purged and redirected ${redirectedCount} active tabs on blocked domains.`);
    }
    return redirectedCount;
  } catch (err) {
    console.debug('[FocusFlow DNR] Error querying or purging open tabs:', err);
    return 0;
  }
}
