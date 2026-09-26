import { describe, it, expect } from 'vitest';
import {
  compileProfileDnrRules,
  BLOCK_RULE_ID_BASE,
  ALLOW_RULE_ID_BASE,
  isUrlBlocked
} from './blockerEngine';
import { FocusProfile } from '@focusflow/shared';

describe('Blocker Engine DeclarativeNetRequest Rules', () => {
  const mockProfile: FocusProfile = {
    id: 'test-profile',
    name: 'Coding',
    durationMinutes: 60,
    blockedDomains: ['youtube.com', 'instagram.com', 'reddit.com'],
    allowedDomains: ['music.youtube.com', 'developer.mozilla.org'],
    isPreset: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  it('compiles block and allow rules with correct priority order', () => {
    const rules = compileProfileDnrRules(mockProfile);

    // 3 blocked + 2 allowed = 5 rules total
    expect(rules).toHaveLength(5);

    // Allow rules must have priority 2
    const allowRules = rules.filter((r) => r.action.type === 'allow');
    expect(allowRules).toHaveLength(2);
    allowRules.forEach((r) => {
      expect(r.priority).toBe(2);
      expect(r.id).toBeGreaterThanOrEqual(ALLOW_RULE_ID_BASE);
    });

    // Block rules must have priority 1 and redirect to /blocked.html
    const blockRules = rules.filter((r) => r.action.type === 'redirect');
    expect(blockRules).toHaveLength(3);
    blockRules.forEach((r) => {
      expect(r.priority).toBe(1);
      expect(r.id).toBeGreaterThanOrEqual(BLOCK_RULE_ID_BASE);
      expect(r.action.redirect?.extensionPath).toContain('/blocked.html?domain=');
    });
  });

  it('generates specific url filters with leading ||', () => {
    const rules = compileProfileDnrRules(mockProfile);
    const ytBlockRule = rules.find((r) => r.condition.urlFilter === '||youtube.com');
    expect(ytBlockRule).toBeDefined();
    expect(ytBlockRule?.action.type).toBe('redirect');

    const ytMusicAllowRule = rules.find((r) => r.condition.urlFilter === '||music.youtube.com');
    expect(ytMusicAllowRule).toBeDefined();
    expect(ytMusicAllowRule?.action.type).toBe('allow');
    expect(ytMusicAllowRule?.priority).toBe(2);
  });

  it('returns empty rules when profile has no domains', () => {
    const emptyProfile: FocusProfile = {
      ...mockProfile,
      blockedDomains: [],
      allowedDomains: []
    };
    const rules = compileProfileDnrRules(emptyProfile);
    expect(rules).toHaveLength(0);
  });
});

describe('Blocker Engine URL Matching and Open Tab Purge', () => {
  const blocked = ['youtube.com', 'reddit.com', 'x.com'];
  const allowed = ['music.youtube.com'];

  it('correctly matches root domains and subdomains', () => {
    // Exact match
    expect(isUrlBlocked('https://youtube.com/watch?v=abc', blocked, allowed)).toBe(true);
    // Subdomain match
    expect(isUrlBlocked('https://www.youtube.com/', blocked, allowed)).toBe(true);
    expect(isUrlBlocked('https://old.reddit.com/r/programming', blocked, allowed)).toBe(true);
    // Allowed subdomain override
    expect(isUrlBlocked('https://music.youtube.com/playlist', blocked, allowed)).toBe(false);
    // Non-blocked domain
    expect(isUrlBlocked('https://github.com/trending', blocked, allowed)).toBe(false);
    // Non-http URLs
    expect(isUrlBlocked('chrome://extensions', blocked, allowed)).toBe(false);
    expect(isUrlBlocked('about:blank', blocked, allowed)).toBe(false);
  });

  it('handles invalid or malformed URLs gracefully', () => {
    expect(isUrlBlocked('', blocked, allowed)).toBe(false);
    expect(isUrlBlocked('not-a-valid-url', blocked, allowed)).toBe(false);
  });
});

