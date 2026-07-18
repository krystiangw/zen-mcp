import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { ZenConfig } from '../config.js';
import { endpoints } from '../client/endpoints.js';
import type { ZenClient } from '../client/http.js';
import { currencySchema } from './currencies.js';
import {
  amountSchema,
  deriveIdempotencyKey,
  errorResult,
  idempotencyKeySchema,
  merchantTransactionIdSchema,
  normalizeAmount,
  successResult,
} from './shared.js';

const destructiveAnnotations = { readOnlyHint: false, destructiveHint: true } as const;

export function register(server: McpServer, client: ZenClient, _cfg: ZenConfig): void {
  server.registerTool(
    'refund_transaction',
    {
      title: 'Refund transaction',
      description: 'Destructive write: return all or part of a payment to the customer. Confirm the transaction and amount before use.',
      inputSchema: {
        transactionId: z.string().min(1).optional(),
        zenId: z.string().min(1).optional(),
        amount: amountSchema.optional(),
        idempotencyKey: idempotencyKeySchema,
      },
      annotations: destructiveAnnotations,
    },
    async ({ transactionId, zenId, amount, idempotencyKey }) => {
      try {
        if (Boolean(transactionId) === Boolean(zenId)) {
          throw new Error('Provide exactly one of transactionId or zenId.');
        }
        const body = {
          transactionId: transactionId ?? zenId as string,
          ...(amount !== undefined ? { amount: normalizeAmount(amount) } : {}),
        };
        const refund = await client.request<Record<string, unknown>>('POST', endpoints.createRefund(), {
          body,
          sign: true,
          idempotencyKey,
        });
        return successResult(`Refund ${String(refund.id ?? 'created')} submitted.`, refund);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'capture_transaction',
    {
      title: 'Capture transaction',
      description: 'Destructive write: capture an authorized transaction, causing funds to be collected. Confirm before use.',
      inputSchema: {
        id: z.string().min(1),
        amount: amountSchema.optional(),
        idempotencyKey: idempotencyKeySchema,
      },
      annotations: destructiveAnnotations,
    },
    async ({ id, amount, idempotencyKey }) => {
      try {
        const body = amount !== undefined ? { amount: normalizeAmount(amount) } : {};
        const transaction = await client.request<Record<string, unknown>>('POST', endpoints.captureTransaction(id), {
          body,
          sign: true,
          idempotencyKey,
        });
        return successResult(`Transaction ${id} captured.`, transaction);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'cancel_transaction',
    {
      title: 'Cancel transaction',
      description: 'Destructive write: cancel a ZEN transaction. This may prevent or reverse payment processing; confirm before use.',
      inputSchema: {
        id: z.string().min(1),
        idempotencyKey: idempotencyKeySchema,
      },
      annotations: destructiveAnnotations,
    },
    async ({ id, idempotencyKey }) => {
      try {
        const transaction = await client.request<Record<string, unknown>>('POST', endpoints.cancelTransaction(id), {
          body: {},
          sign: true,
          idempotencyKey,
        });
        return successResult(`Transaction ${id} canceled.`, transaction);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'create_payout',
    {
      title: 'Create payout',
      description: 'Highest-risk destructive write: send money outward through ZEN. Verify recipient, channel, currency, and amount before use.',
      inputSchema: {
        amount: amountSchema,
        currency: currencySchema,
        paymentChannel: z.string().min(1),
        merchantTransactionId: merchantTransactionIdSchema,
        customerFirstName: z.string().min(1).optional(),
        customerLastName: z.string().min(1).optional(),
        customerEmail: z.string().email().optional(),
        customerPhone: z.string().min(3).optional(),
        idempotencyKey: idempotencyKeySchema,
      },
      annotations: destructiveAnnotations,
    },
    async ({ amount, currency, paymentChannel, merchantTransactionId, customerFirstName, customerLastName, customerEmail, customerPhone, idempotencyKey }) => {
      try {
        const customer = {
          ...(customerEmail ? { email: customerEmail } : {}),
          ...(customerFirstName ? { firstName: customerFirstName } : {}),
          ...(customerLastName ? { lastName: customerLastName } : {}),
          ...(customerPhone ? { phone: customerPhone } : {}),
        };
        const body = {
          amount: normalizeAmount(amount),
          currency,
          paymentChannel,
          merchantTransactionId,
          ...(Object.keys(customer).length > 0 ? { customer } : {}),
        };
        const payout = await client.request<Record<string, unknown>>('POST', endpoints.createPayout(), {
          body,
          sign: true,
          idempotencyKey: deriveIdempotencyKey(idempotencyKey, merchantTransactionId),
        });
        return successResult(`Payout ${String(payout.id ?? 'created')} submitted.`, payout);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'create_customer',
    {
      title: 'Create customer',
      description: 'Write operation: create a customer record in ZEN for future payment flows; this stores personal data.',
      inputSchema: {
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        email: z.string().email(),
        phone: z.string().min(3).optional(),
        idempotencyKey: idempotencyKeySchema,
      },
      annotations: { readOnlyHint: false },
    },
    async ({ firstName, lastName, email, phone, idempotencyKey }) => {
      try {
        const body = {
          email,
          ...(firstName ? { firstName } : {}),
          ...(lastName ? { lastName } : {}),
          ...(phone ? { phone } : {}),
        };
        const customer = await client.request<Record<string, unknown>>('POST', endpoints.createCustomer(), {
          body,
          sign: true,
          idempotencyKey,
        });
        return successResult(`Customer ${String(customer.id ?? 'created')} created.`, customer);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
