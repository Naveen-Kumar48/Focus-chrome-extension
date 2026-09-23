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
