import { describe, expect, it } from 'vitest';

import { loadConfig, ZenConfigError } from '../src/config.js';

describe('loadConfig', () => {
  it('selects sandbox by default and production explicitly', () => {
    expect(loadConfig({}).baseUrl).toBe('https://api.zen-test.com');
    expect(loadConfig({ ZEN_ENV: 'production' }).baseUrl).toBe('https://api.zen.com');
  });

  it('gives ZEN_BASE_URL priority and removes trailing slashes', () => {
    const cfg = loadConfig({
      ZEN_ENV: 'production',
      ZEN_BASE_URL: 'http://localhost:8787///',
    });
    expect(cfg.baseUrl).toBe('http://localhost:8787');
  });

  it('parses both supported mock flags', () => {
    expect(loadConfig({ ZEN_MOCK: '1' }).mock).toBe(true);
    expect(loadConfig({ ZEN_MOCK: 'true' }).mock).toBe(true);
    expect(loadConfig({ ZEN_MOCK: 'TRUE' }).mock).toBe(false);
  });

  it('defaults and validates the hash algorithm', () => {
    expect(loadConfig({}).hashAlg).toBe('sha256');
    expect(loadConfig({ ZEN_HASH_ALG: 'sha512' }).hashAlg).toBe('sha512');
    expect(() => loadConfig({ ZEN_HASH_ALG: 'md5' })).toThrow(ZenConfigError);
  });

  it('rejects a mistyped ZEN_ENV instead of silently using sandbox', () => {
    expect(() => loadConfig({ ZEN_ENV: 'prod' })).toThrow(ZenConfigError);
    expect(() => loadConfig({ ZEN_ENV: 'live' })).toThrow(ZenConfigError);
    expect(loadConfig({ ZEN_ENV: 'sandbox' }).baseUrl).toBe('https://api.zen-test.com');
  });

  it('rejects an invalid ZEN_BASE_URL override', () => {
    expect(() => loadConfig({ ZEN_BASE_URL: 'not a url' })).toThrow(ZenConfigError);
  });
});
