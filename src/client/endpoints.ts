// Service versions (v1/v2/v3) must be verified per endpoint against live docs.
export const endpoints = Object.freeze({
  createTransaction: () => '/v1/transactions',
  captureTransaction: (id: string) => `/v1/transactions/${encodeURIComponent(id)}/capture`,
  cancelTransaction: (id: string) => `/v1/transactions/${encodeURIComponent(id)}/cancel`,
  getTransactionByZenId: (id: string) => `/v1/transactions/${encodeURIComponent(id)}`,
  getTransactionByMerchantId: (id: string) =>
    `/v1/transactions/merchant/${encodeURIComponent(id)}`,
  createRefund: () => '/v1/refunds',
  createPayout: () => '/v1/payouts',
  getPayout: (id: string) => `/v1/payouts/${encodeURIComponent(id)}`,
  createCustomer: () => '/v3/customers',
  paymentMethods: () => '/v1/payment-methods',
  createPaymentLink: () => '/v1/payment-links',
  listPaymentLinks: () => '/v1/payment-links',
  getPaymentLink: (id: string) => `/v1/payment-links/${encodeURIComponent(id)}`,
  downloadReport: () => '/v1/reports/download',
} as const);
