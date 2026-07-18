import type { ZenConfig } from '../config.js';
import { requireApiKey } from '../config.js';
import { mockResponse } from './mock.js';
import { computeSignature } from './signature.js';

export { ZenConfigError } from '../config.js';

export class ZenClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ZenClientError';
  }
}

export interface ZenRequestOptions {
  body?: Record<string, unknown>;
  query?: Record<string, string | number | boolean | undefined>;
  sign?: boolean;
  idempotencyKey?: string;
}

function messageFromBody(body: unknown): string {
  if (body && typeof body === 'object') {
    const candidate = body as Record<string, unknown>;
    if (typeof candidate.message === 'string') return candidate.message;
    if (typeof candidate.error === 'string') return candidate.error;
  }
  return typeof body === 'string' && body ? body : 'ZEN API request failed';
}

function parseResponseBody(text: string): unknown {
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class ZenClient {
  constructor(
    private readonly cfg: ZenConfig,
    private readonly timeoutMs = 30_000,
  ) {}

  async request<T>(method: string, path: string, options: ZenRequestOptions = {}): Promise<T> {
    const normalizedMethod = method.toUpperCase();
    if (this.cfg.mock) {
      return mockResponse(normalizedMethod, path, options.body) as T;
    }

    const apiKey = requireApiKey(this.cfg);
    const url = new URL(`${this.cfg.baseUrl}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    let requestBody = options.body ? { ...options.body } : undefined;
    if (options.sign && requestBody) {
      if (!this.cfg.paywallSecret) {
        throw new ZenClientError('ZEN_PAYWALL_SECRET is required for signed requests.');
      }
      requestBody = {
        ...requestBody,
        signature: computeSignature(requestBody, this.cfg.paywallSecret, this.cfg.hashAlg),
      };
    }

    const headers: Record<string, string> = {
      Authorization: apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

    const retryableMethod =
      normalizedMethod === 'GET' ||
      (normalizedMethod === 'POST' && Boolean(options.idempotencyKey));
    const maxAttempts = retryableMethod ? 3 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await fetch(url, {
          method: normalizedMethod,
          headers,
          body: requestBody ? JSON.stringify(requestBody) : undefined,
          signal: controller.signal,
        });
        const responseBody = parseResponseBody(await response.text());

        if (response.ok) return responseBody as T;

        const error = new ZenClientError(
          `ZEN API returned HTTP ${response.status}: ${messageFromBody(responseBody)}`,
          response.status,
          responseBody,
        );
        const retryableStatus = response.status === 429 || response.status >= 500;
        if (!retryableStatus || attempt === maxAttempts) throw error;
      } catch (error) {
        if (error instanceof ZenClientError) {
          const retryableStatus =
            error.status === undefined || error.status === 429 || error.status >= 500;
          if (!retryableStatus || attempt === maxAttempts) throw error;
        } else if (attempt === maxAttempts) {
          throw new ZenClientError(
            error instanceof Error ? `ZEN API network error: ${error.message}` : 'ZEN API network error.',
          );
        }
      } finally {
        clearTimeout(timeout);
      }

      await delay(250 * 2 ** (attempt - 1));
    }

    throw new ZenClientError('ZEN API request failed after retries.');
  }
}
