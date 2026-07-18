import crypto from 'node:crypto';
import { z } from 'zod';

import { ZenClientError } from '../client/http.js';

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

// Enforce positivity AND at-most-two-decimals on BOTH branches: the string
// form must reject zero ("0.00"), the numeric form must reject >2 decimals
// (10.999). Amounts are forwarded to ZEN as monetary strings, so ambiguous
// or zero values must never reach the API.
export const amountSchema = z.union([
  z
    .string()
    .regex(AMOUNT_PATTERN, 'Amount must have at most two decimal places')
    .refine((value) => Number(value) > 0, 'Amount must be greater than zero'),
  z
    .number()
    .positive('Amount must be greater than zero')
    .refine(
      (value) => AMOUNT_PATTERN.test(value.toString()),
      'Amount must have at most two decimal places',
    ),
]);

export const merchantTransactionIdSchema = z.string().min(1).max(128);
export const idempotencyKeySchema = z.string().min(1).max(255).optional();

export function normalizeAmount(amount: string | number): string {
  return typeof amount === 'number' ? String(amount) : amount;
}

export function deriveIdempotencyKey(
  supplied: string | undefined,
  merchantTransactionId?: string,
): string | undefined {
  if (supplied) return supplied;
  if (!merchantTransactionId) return undefined;
  const digest = crypto.createHash('sha256').update(merchantTransactionId, 'utf8').digest('hex');
  return `zen-mcp-${digest}`;
}

export function errorResult(error: unknown) {
  let message = error instanceof Error ? error.message : 'Unknown error';
  // Surface the HTTP status for API failures — it makes 401 (bad key) vs 422
  // (bad payload) immediately distinguishable for the caller. Secrets are
  // never included in ZenClientError messages.
  if (error instanceof ZenClientError && error.status !== undefined && !message.includes(`HTTP ${error.status}`)) {
    message = `HTTP ${error.status}: ${message}`;
  }
  return {
    content: [{ type: 'text' as const, text: `Error: ${message}` }],
    isError: true,
  };
}

/**
 * ZEN response shapes are docs-derived and unverified: list endpoints may
 * return a bare array or an envelope object (e.g. { items: [...] }). Count
 * defensively instead of assuming `.length` exists.
 */
export function countItems(data: unknown): number | undefined {
  if (Array.isArray(data)) return data.length;
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    for (const key of ['items', 'data', 'results', 'elements']) {
      if (Array.isArray(record[key])) return (record[key] as unknown[]).length;
    }
  }
  return undefined;
}

export function successResult(text: string, data: unknown) {
  const structuredContent = asStructuredContent(data);
  return {
    content: [{ type: 'text' as const, text }],
    structuredContent,
  };
}

function asStructuredContent(data: unknown): Record<string, unknown> {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return { items: data };
}
