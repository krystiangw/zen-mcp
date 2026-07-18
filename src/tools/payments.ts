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

export function register(server: McpServer, client: ZenClient, _cfg: ZenConfig): void {
  server.registerTool(
    'create_payment_link',
    {
      title: 'Create payment link',
      description: 'Write operation: create a hosted ZEN checkout link and QR code for a customer to pay.',
      inputSchema: {
        amount: amountSchema,
        currency: currencySchema,
        description: z.string().max(500).optional(),
        merchantTransactionId: merchantTransactionIdSchema,
        customIpnUrl: z.string().url().optional(),
        expiresAt: z.string().datetime().optional(),
        idempotencyKey: idempotencyKeySchema,
      },
      annotations: { readOnlyHint: false },
    },
    async ({ amount, currency, description, merchantTransactionId, customIpnUrl, expiresAt, idempotencyKey }) => {
      try {
        const body = {
          amount: normalizeAmount(amount),
          currency,
          merchantTransactionId,
          ...(description ? { description } : {}),
          ...(customIpnUrl ? { customIpnUrl } : {}),
          ...(expiresAt ? { expiresAt } : {}),
        };
        const link = await client.request<Record<string, unknown>>('POST', endpoints.createPaymentLink(), {
          body,
          sign: true,
          idempotencyKey: deriveIdempotencyKey(idempotencyKey, merchantTransactionId),
        });
        return successResult(`Payment link created: ${String(link.url ?? link.id ?? 'success')}.`, link);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
