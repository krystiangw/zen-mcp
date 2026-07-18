const CREATED_AT = '2025-01-15T12:00:00.000Z';

export function mockResponse(method: string, path: string, body?: unknown): unknown {
  const requestBody = (body ?? {}) as Record<string, unknown>;

  if (path === '/v1/payment-methods') {
    return [
      { id: 'card', name: 'Card', paymentChannel: 'PCL_CARD', enabled: true },
      { id: 'blik', name: 'BLIK', paymentChannel: 'PCL_BLIK', enabled: true },
    ];
  }

  if (path === '/v1/payment-links' && method === 'POST') {
    return {
      id: 'plink_mock_001',
      url: 'https://secure.zen.com/payment/plink_mock_001',
      qrCodeUrl: 'https://secure.zen.com/payment/plink_mock_001/qr',
      amount: requestBody.amount ?? '19.99',
      currency: requestBody.currency ?? 'EUR',
      merchantTransactionId: requestBody.merchantTransactionId ?? 'order_mock_001',
      status: 'NEW',
      createdAt: CREATED_AT,
    };
  }

  if (path === '/v1/payment-links' && method === 'GET') {
    return [{
      id: 'plink_mock_001',
      url: 'https://secure.zen.com/payment/plink_mock_001',
      qrCodeUrl: 'https://secure.zen.com/payment/plink_mock_001/qr',
      amount: '19.99',
      currency: 'EUR',
      status: 'NEW',
    }];
  }

  if (path.startsWith('/v1/payment-links/')) {
    return {
      id: decodeURIComponent(path.slice('/v1/payment-links/'.length)),
      url: 'https://secure.zen.com/payment/plink_mock_001',
      qrCodeUrl: 'https://secure.zen.com/payment/plink_mock_001/qr',
      amount: '19.99',
      currency: 'EUR',
      status: 'NEW',
    };
  }

  if (path === '/v1/refunds') {
    return {
      id: 'refund_mock_001',
      transactionId: requestBody.transactionId,
      amount: requestBody.amount ?? '19.99',
      currency: 'EUR',
      status: 'ACCEPTED',
      createdAt: CREATED_AT,
    };
  }

  if (path === '/v1/payouts') {
    return {
      id: 'payout_mock_001',
      ...requestBody,
      status: 'PENDING',
      createdAt: CREATED_AT,
    };
  }

  if (path.startsWith('/v1/payouts/')) {
    return {
      id: decodeURIComponent(path.slice('/v1/payouts/'.length)),
      merchantTransactionId: 'payout_order_mock_001',
      amount: '25.00',
      currency: 'EUR',
      paymentChannel: 'PCL_CARD',
      status: 'PENDING',
      createdAt: CREATED_AT,
    };
  }

  if (path === '/v3/customers') {
    return { id: 'customer_mock_001', ...requestBody, createdAt: CREATED_AT };
  }

  if (path === '/v1/reports/download') {
    return { url: 'https://api.zen-test.com/mock/reports/report_mock_001.csv' };
  }

  if (path.includes('/transactions/')) {
    const isAction = path.endsWith('/capture') || path.endsWith('/cancel');
    const id = path.split('/').filter(Boolean).at(isAction ? -2 : -1) ?? 'transaction_mock_001';
    return {
      id: decodeURIComponent(id),
      merchantTransactionId: 'order_mock_001',
      amount: requestBody.amount ?? '19.99',
      currency: 'EUR',
      status: path.endsWith('/cancel') ? 'CANCELED' : 'ACCEPTED',
      createdAt: CREATED_AT,
    };
  }

  return { ok: true, method, path, ...requestBody };
}
