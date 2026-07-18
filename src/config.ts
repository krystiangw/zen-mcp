export type ZenHashAlgorithm = 'sha224' | 'sha256' | 'sha384' | 'sha512';

export interface ZenConfig {
  apiKey?: string;
  paywallSecret?: string;
  ipnSecret?: string;
  baseUrl: string;
  mock: boolean;
  hashAlg: ZenHashAlgorithm;
}

export class ZenConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZenConfigError';
  }
}

const HASH_ALGORITHMS: readonly ZenHashAlgorithm[] = [
  'sha224',
  'sha256',
  'sha384',
  'sha512',
];

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ZenConfig {
  const configuredAlgorithm = env.ZEN_HASH_ALG ?? 'sha256';
  if (!HASH_ALGORITHMS.includes(configuredAlgorithm as ZenHashAlgorithm)) {
    throw new ZenConfigError(
      `Invalid ZEN_HASH_ALG. Expected one of: ${HASH_ALGORITHMS.join(', ')}.`,
    );
  }

  // Fail loudly on a mistyped environment: silently falling back to sandbox
  // (or worse, the operator believing they are on sandbox) is dangerous for a
  // payments integration.
  if (env.ZEN_ENV !== undefined && env.ZEN_ENV !== 'production' && env.ZEN_ENV !== 'sandbox') {
    throw new ZenConfigError(
      `Invalid ZEN_ENV "${env.ZEN_ENV}". Expected "production" or "sandbox".`,
    );
  }

  const defaultBaseUrl =
    env.ZEN_ENV === 'production' ? 'https://api.zen.com' : 'https://api.zen-test.com';
  const baseUrl = (env.ZEN_BASE_URL ?? defaultBaseUrl).replace(/\/+$/, '');

  if (!baseUrl) {
    throw new ZenConfigError('ZEN_BASE_URL must not be empty.');
  }
  try {
    // Reject garbage overrides early instead of failing on the first request.
    void new URL(baseUrl);
  } catch {
    throw new ZenConfigError(`ZEN_BASE_URL is not a valid URL: "${baseUrl}".`);
  }

  return {
    apiKey: env.ZEN_API_KEY,
    paywallSecret: env.ZEN_PAYWALL_SECRET,
    ipnSecret: env.ZEN_IPN_SECRET,
    baseUrl,
    mock: env.ZEN_MOCK === '1' || env.ZEN_MOCK === 'true',
    hashAlg: configuredAlgorithm as ZenHashAlgorithm,
  };
}

export function requireApiKey(cfg: ZenConfig): string {
  if (!cfg.apiKey && !cfg.mock) {
    throw new ZenConfigError('ZEN_API_KEY is required outside mock mode.');
  }
  return cfg.apiKey ?? '';
}
