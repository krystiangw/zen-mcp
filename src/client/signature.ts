import crypto from 'node:crypto';

import type { ZenHashAlgorithm } from '../config.js';

/*
 * Algorithm derived from public docs.zen.com; VERIFY against live
 * OpenAPI/Postman before production. The exact flattening of arrays/nested
 * objects for signing is not fully specified publicly.
 */

function flatten(value: unknown, prefix: string, entries: string[]): void {
  if (value === null || value === undefined) return;

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    if (prefix) entries.push(`${prefix}=${String(value)}`);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, `${prefix}[${index}]`, entries));
    return;
  }

  if (typeof value === 'object') {
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      flatten(nestedValue, prefix ? `${prefix}.${key}` : key, entries);
    }
  }
}

export function computeSignature(
  body: Record<string, unknown>,
  secret: string,
  alg: ZenHashAlgorithm = 'sha256',
): string {
  const entries: string[] = [];
  flatten(body, '', entries);
  const input = `${entries.map((entry) => entry.toLowerCase()).sort().join('&')}${secret}`;
  const hex = crypto.createHash(alg).update(input, 'utf8').digest('hex');
  return `${hex};${alg}`;
}

export function verifyIpnSignature(
  payload: Record<string, unknown>,
  receivedSignature: string,
  secret: string,
  alg: ZenHashAlgorithm = 'sha256',
): boolean {
  try {
    const unsignedPayload = { ...payload };
    delete unsignedPayload.signature;
    const expected = computeSignature(unsignedPayload, secret, alg).split(';')[0];

    // The signature carries a trailing ";<alg>" suffix. It must not be silently
    // discarded: a correct digest paired with a mismatched/garbage suffix
    // (e.g. "<sha256 digest>;sha512") must NOT verify against the configured
    // algorithm. Authenticate the suffix when present.
    const [received, declaredAlg] = receivedSignature.split(';');
    if (declaredAlg !== undefined && declaredAlg.toLowerCase() !== alg) return false;

    if (!/^[a-f\d]+$/i.test(received) || received.length % 2 !== 0) return false;
    const expectedBuffer = Buffer.from(expected, 'hex');
    const receivedBuffer = Buffer.from(received, 'hex');
    if (expectedBuffer.length !== receivedBuffer.length) return false;
    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}
