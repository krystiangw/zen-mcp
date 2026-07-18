import { z } from 'zod';

export const CURRENCIES = [
  'AED', 'AUD', 'BGN', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD',
  'HUF', 'ILS', 'JPY', 'KES', 'MXN', 'NOK', 'NZD', 'PLN', 'QAR', 'RON', 'SAR',
  'SEK', 'SGD', 'THB', 'TRY', 'UGX', 'USD', 'ZAR', 'ISK',
] as const;

export type SupportedCurrency = (typeof CURRENCIES)[number];

const currencySet = new Set<string>(CURRENCIES);

export const currencySchema = z
  .string()
  .length(3)
  .toUpperCase()
  .refine((currency) => currencySet.has(currency), 'Unsupported ZEN currency');

export function assertSupportedCurrency(currency: string): SupportedCurrency {
  const normalized = currency.toUpperCase();
  if (!currencySet.has(normalized)) {
    throw new Error(`Unsupported ZEN currency: ${currency}`);
  }
  return normalized as SupportedCurrency;
}
