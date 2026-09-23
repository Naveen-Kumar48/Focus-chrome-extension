export interface DomainValidationResult {
  isValid: boolean;
  normalizedDomain: string | null;
  error?: string;
}

// Known brand name mappings for friendly UI display
const POPULAR_DOMAINS_MAP: Record<string, string> = {
  'youtube.com': 'YouTube',
  'instagram.com': 'Instagram',
  'facebook.com': 'Facebook',
  'reddit.com': 'Reddit',
  'netflix.com': 'Netflix',
  'x.com': 'X (Twitter)',
  'twitter.com': 'Twitter',
  'tiktok.com': 'TikTok',
  'linkedin.com': 'LinkedIn',
  'twitch.tv': 'Twitch',
  'discord.com': 'Discord',
  'pinterest.com': 'Pinterest'
};

/**
 * Normalizes and validates a domain name string.
 * Strips protocols (http/https), port numbers, pathnames, queries, hashes, and leading 'www.'.
 * Preserves intentional subdomains (e.g. m.youtube.com).
 */
export function normalizeDomain(input: string): DomainValidationResult {
  if (!input || typeof input !== 'string') {
    return { isValid: false, normalizedDomain: null, error: 'Domain name cannot be empty.' };
  }

  let cleaned = input.trim().toLowerCase();

  if (cleaned.length === 0) {
    return { isValid: false, normalizedDomain: null, error: 'Domain name cannot be empty.' };
  }

  // 1. Strip protocols if present
  if (cleaned.startsWith('http://')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('https://')) {
    cleaned = cleaned.slice(8);
  } else if (cleaned.includes('://')) {
    return {
      isValid: false,
      normalizedDomain: null,
      error: 'Unsupported URL protocol scheme.'
    };
  }

  // 2. Strip paths, queries, and fragments
  cleaned = cleaned.split('/')[0].split('?')[0].split('#')[0];

  // 3. Strip port numbers if present
  cleaned = cleaned.split(':')[0];

  // 4. Strip leading 'www.' for canonicalization
  if (cleaned.startsWith('www.')) {
    cleaned = cleaned.slice(4);
  }

  // 5. Basic RFC domain pattern check:
  // Must consist of alphanumeric labels separated by dots, with a valid TLD (2-63 chars)
  const validDomainPattern =
    /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})*\.[a-z]{2,63}$/;

  if (!validDomainPattern.test(cleaned)) {
    return {
      isValid: false,
      normalizedDomain: null,
      error: 'Invalid domain format. Example: youtube.com or m.youtube.com'
    };
  }

  // 6. Prohibited browser internal schemes & reserved names
  const prohibited = [
    'chrome',
    'chrome-extension',
    'edge',
    'devtools',
    'about',
    'settings',
    'extensions'
  ];
  if (prohibited.includes(cleaned)) {
    return {
      isValid: false,
      normalizedDomain: null,
      error: 'Cannot block browser internal pages.'
    };
  }

  return {
    isValid: true,
    normalizedDomain: cleaned
  };
}

/**
 * Returns a friendly display name for a domain.
 */
export function getDomainDisplayName(domain: string): string {
  const normalized = domain.toLowerCase();
  if (POPULAR_DOMAINS_MAP[normalized]) {
    return POPULAR_DOMAINS_MAP[normalized];
  }

  // If subdomain, e.g. m.youtube.com
  const parts = normalized.split('.');
  if (parts.length >= 2) {
    const mainName = parts[parts.length - 2];
    return mainName.charAt(0).toUpperCase() + mainName.slice(1);
  }

  return domain;
}

/**
 * Validates whether a domain already exists in the given blocklist.
 */
export function validateDomainUniqueness(
  domain: string,
  existingList: string[]
): { isUnique: boolean; error?: string } {
  const normalized = domain.toLowerCase();
  const exists = existingList.some((item) => item.toLowerCase() === normalized);

  if (exists) {
    return { isUnique: false, error: `'${domain}' is already in your blocked list.` };
  }

  return { isUnique: true };
}
