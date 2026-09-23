import { describe, it, expect } from 'vitest';
import {
  normalizeDomain,
  getDomainDisplayName,
  validateDomainUniqueness
} from './domainNormalizer';

describe('Domain Normalization & Validation Utility', () => {
  it('normalizes standard domains accurately', () => {
    const res = normalizeDomain('youtube.com');
    expect(res.isValid).toBe(true);
    expect(res.normalizedDomain).toBe('youtube.com');
  });

  it('strips leading www correctly', () => {
    const res = normalizeDomain('www.youtube.com');
    expect(res.isValid).toBe(true);
    expect(res.normalizedDomain).toBe('youtube.com');
  });

  it('preserves subdomains like m.youtube.com', () => {
    const res = normalizeDomain('m.youtube.com');
    expect(res.isValid).toBe(true);
    expect(res.normalizedDomain).toBe('m.youtube.com');
  });

  it('strips protocols, query parameters, trailing paths, and hashes', () => {
    const res = normalizeDomain('https://www.youtube.com/watch?v=dQw4w9WgXcQ#t=42');
    expect(res.isValid).toBe(true);
    expect(res.normalizedDomain).toBe('youtube.com');

    const res2 = normalizeDomain('HTTP://REDDIT.COM/r/all?sort=top');
    expect(res2.isValid).toBe(true);
    expect(res2.normalizedDomain).toBe('reddit.com');
  });

  it('handles uppercase characters and whitespace', () => {
    const res = normalizeDomain('   INSTAGRAM.COM   ');
    expect(res.isValid).toBe(true);
    expect(res.normalizedDomain).toBe('instagram.com');
  });

  it('strips port numbers if present', () => {
    const res = normalizeDomain('netflix.com:8080');
    expect(res.isValid).toBe(true);
    expect(res.normalizedDomain).toBe('netflix.com');
  });

  it('handles short social media domains like x.com', () => {
    const res = normalizeDomain('https://x.com/home');
    expect(res.isValid).toBe(true);
    expect(res.normalizedDomain).toBe('x.com');
  });

  it('rejects invalid domain formats and special characters', () => {
    expect(normalizeDomain('').isValid).toBe(false);
    expect(normalizeDomain('   ').isValid).toBe(false);
    expect(normalizeDomain('not a domain').isValid).toBe(false);
    expect(normalizeDomain('bad$domain.com').isValid).toBe(false);
    expect(normalizeDomain('justaword').isValid).toBe(false);
    expect(normalizeDomain('ftp://badsite.com').isValid).toBe(false);
  });

  it('rejects browser internal surfaces', () => {
    expect(normalizeDomain('chrome://extensions').isValid).toBe(false);
    expect(normalizeDomain('edge://settings').isValid).toBe(false);
  });

  it('derives friendly display names', () => {
    expect(getDomainDisplayName('youtube.com')).toBe('YouTube');
    expect(getDomainDisplayName('instagram.com')).toBe('Instagram');
    expect(getDomainDisplayName('reddit.com')).toBe('Reddit');
    expect(getDomainDisplayName('netflix.com')).toBe('Netflix');
    expect(getDomainDisplayName('x.com')).toBe('X (Twitter)');
    expect(getDomainDisplayName('somesite.org')).toBe('Somesite');
  });

  it('validates domain uniqueness and prevents duplicates', () => {
    const list = ['youtube.com', 'instagram.com', 'reddit.com'];

    const duplicateCheck = validateDomainUniqueness('youtube.com', list);
    expect(duplicateCheck.isUnique).toBe(false);
    expect(duplicateCheck.error).toContain('already in your blocked list');

    const duplicateCaseCheck = validateDomainUniqueness('YOUTUBE.COM', list);
    expect(duplicateCaseCheck.isUnique).toBe(false);

    const newDomainCheck = validateDomainUniqueness('netflix.com', list);
    expect(newDomainCheck.isUnique).toBe(true);
  });
});
