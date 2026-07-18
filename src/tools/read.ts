import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { ZenConfig } from '../config.js';
import { endpoints } from '../client/endpoints.js';
import type { ZenClient } from '../client/http.js';
import { CURRENCIES } from './currencies.js';
import { errorResult, merchantTransactionIdSchema, successResult } from './shared.js';

const readAnnotations = { readOnlyHint: true, openWorldHint: true } as const;

export function register(server: McpServer, client: ZenClient, _cfg: ZenConfig): void {
  server.registerTool(
    'list_payment_methods',
    {
      title: 'List payment methods',
      description: 'Read-only: list payment methods available to the configured ZEN terminal.',
      inputSchema: {},
      annotations: readAnnotations,
    },
    async () => {
      try {
        const methods = await client.request<unknown[]>('GET', endpoints.paymentMethods());
        return successResult(`Found ${methods.length} payment method(s).`, methods);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'get_transaction',
    {
      title: 'Get transaction',
      description: 'Read-only: retrieve a transaction by exactly one ZEN ID or merchant transaction ID.',
      inputSchema: {
        zenId: z.string().min(1).optional(),
        merchantTransactionId: merchantTransactionIdSchema.optional(),
      },
      annotations: readAnnotations,
    },
    async ({ zenId, merchantTransactionId }) => {
      try {
        if (Boolean(zenId) === Boolean(merchantTransactionId)) {
          throw new Error('Provide exactly one of zenId or merchantTransactionId.');
        }
        const path = zenId
          ? endpoints.getTransactionByZenId(zenId)
          : endpoints.getTransactionByMerchantId(merchantTransactionId as string);
        const transaction = await client.request<Record<string, unknown>>('GET', path);
        return successResult(`Transaction ${String(transaction.id ?? zenId ?? merchantTransactionId)} retrieved.`, transaction);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'list_payment_links',
    {
      title: 'List payment links',
      description: 'Read-only: list hosted ZEN payment links.',
      inputSchema: {
        page: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        status: z.string().min(1).optional(),
      },
      annotations: readAnnotations,
    },
    async (query) => {
      try {
        const links = await client.request<unknown[]>('GET', endpoints.listPaymentLinks(), { query });
        return successResult(`Found ${links.length} payment link(s).`, links);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'get_payment_link',
    {
      title: 'Get payment link',
      description: 'Read-only: retrieve a hosted ZEN payment link by ID.',
      inputSchema: { id: z.string().min(1) },
      annotations: readAnnotations,
    },
    async ({ id }) => {
      try {
        const link = await client.request<Record<string, unknown>>('GET', endpoints.getPaymentLink(id));
        return successResult(`Payment link ${id} retrieved.`, link);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'get_payout',
    {
      title: 'Get payout',
      description: 'Read-only: retrieve a ZEN payout by its ZEN ID.',
      inputSchema: { zenId: z.string().min(1) },
      annotations: readAnnotations,
    },
    async ({ zenId }) => {
      try {
        const payout = await client.request<Record<string, unknown>>('GET', endpoints.getPayout(zenId));
        return successResult(`Payout ${zenId} retrieved.`, payout);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'download_report',
    {
      title: 'Download report',
      description: 'Read-only: request a transaction or settlement report download from ZEN.',
      inputSchema: {
        startDate: z.string().min(1).optional(),
        endDate: z.string().min(1).optional(),
        reportType: z.string().min(1).optional(),
        format: z.string().min(1).optional(),
      },
      annotations: readAnnotations,
    },
    async (query) => {
      try {
        const report = await client.request<Record<string, unknown>>('GET', endpoints.downloadReport(), { query });
        return successResult(`Report ready: ${String(report.url ?? 'response returned by ZEN')}.`, report);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    'list_supported_currencies',
    {
      title: 'List supported currencies',
      description: 'Read-only: list currencies confirmed in the public ZEN documentation.',
      inputSchema: {},
      annotations: readAnnotations,
    },
    async () => successResult(`${CURRENCIES.length} documented currencies are supported.`, CURRENCIES),
  );
}
