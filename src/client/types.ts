// These permissive shapes are derived from public documentation and remain
// unverified against ZEN's live OpenAPI/Postman definitions.

export type Amount = string;
export type ZenStatus =
  | 'NEW'
  | 'PENDING'
  | 'AUTHORIZED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELED';

export interface Transaction {
  id?: string;
  merchantTransactionId?: string;
  redirectUrl?: string;
  amount?: Amount;
  currency?: string;
  status?: ZenStatus;
  paymentChannel?: string;
  createdAt?: string;
  refunds?: Refund[];
  customer?: Customer;
  [k: string]: unknown;
}

export interface PaymentLink {
  id?: string;
  url?: string;
  qrCodeUrl?: string;
  merchantTransactionId?: string;
  amount?: Amount;
  currency?: string;
  status?: ZenStatus;
  description?: string;
  expiresAt?: string;
  [k: string]: unknown;
}

export interface Payout {
  id?: string;
  merchantTransactionId?: string;
  paymentChannel?: string;
  amount?: Amount;
  currency?: string;
  status?: ZenStatus;
  customer?: Customer;
  createdAt?: string;
  [k: string]: unknown;
}

export interface Customer {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  [k: string]: unknown;
}

export interface Refund {
  id?: string;
  transactionId?: string;
  amount?: Amount;
  currency?: string;
  status?: ZenStatus;
  createdAt?: string;
  [k: string]: unknown;
}

export interface PaymentMethod {
  id?: string;
  name?: string;
  paymentChannel?: string;
  currencies?: string[];
  enabled?: boolean;
  [k: string]: unknown;
}

export interface CreatePaymentLinkRequest {
  amount: Amount;
  currency: string;
  merchantTransactionId: string;
  description?: string;
  customIpnUrl?: string;
  expiresAt?: string;
  [k: string]: unknown;
}

export interface CreatePayoutRequest {
  merchantTransactionId: string;
  paymentChannel: string;
  amount: Amount;
  currency: string;
  customer?: Customer;
  [k: string]: unknown;
}
