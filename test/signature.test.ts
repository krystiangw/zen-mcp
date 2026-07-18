import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { computeSignature, verifyIpnSignature } from '../src/client/signature.js';

function flatten(value: unknown, prefix = '', entries: string[] = []): string[] {
  if (value === null || value === undefined) return entries;
  if (['string', 'number', 'boolean'].includes(typeof value)) {
    entries.push(`${prefix}=${String(value)}`);
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, `${prefix}[${index}]`, entries));
  } else if (typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) =>
      flatten(item, prefix ? `${prefix}.${key}` : key, entries));
  }
  return entries;
}

describe('ZEN signatures', () => {
  const body = {
    amount: '10.50',
    currency: 'EUR',
    active: true,
    customer: { email: 'Buyer@Example.com', ignored: null },
    items: [{ name: 'Coffee', quantity: 2 }],
  };
  const secret = 'fixed-test-secret';

  it('computes the documented flattened sha256 form', () => {
    const input = `${flatten(body).map((entry) => entry.toLowerCase()).sort().join('&')}${secret}`;
    const expected = `${crypto.createHash('sha256').update(input, 'utf8').digest('hex')};sha256`;
    const actual = computeSignature(body, secret);

    expect(actual).toBe(expected);
    expect(actual).toMatch(/;sha256$/);
  });

  it('round-trips and rejects tampered payloads', () => {
    const signature = computeSignature(body, secret);
    expect(verifyIpnSignature(body, signature, secret)).toBe(true);
    expect(verifyIpnSignature({ ...body, amount: '10.51' }, signature, secret)).toBe(false);
    expect(verifyIpnSignature(body, 'not-hex;sha256', secret)).toBe(false);
  });

  it('rejects a correct digest carrying a mismatched or garbage algorithm suffix', () => {
    const digest = computeSignature(body, secret).split(';')[0];
    // Correct sha256 digest but the suffix claims a different / bogus algorithm.
    expect(verifyIpnSignature(body, `${digest};sha512`, secret)).toBe(false);
    expect(verifyIpnSignature(body, `${digest};garbage`, secret)).toBe(false);
    // Suffix matching the configured algorithm still verifies.
    expect(verifyIpnSignature(body, `${digest};sha256`, secret)).toBe(true);
  });
});
