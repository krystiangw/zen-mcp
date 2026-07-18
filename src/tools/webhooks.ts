import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { ZenConfig } from '../config.js';
import type { ZenClient } from '../client/http.js';
import { verifyIpnSignature } from '../client/signature.js';
import { errorResult, successResult } from './shared.js';

export function register(server: McpServer, _client: ZenClient, cfg: ZenConfig): void {
  server.registerTool(
    'verify_webhook_signature',
    {
      title: 'Verify webhook signature',
      description: 'Read-only: verify a ZEN IPN webhook signature using the configured IPN secret.',
      inputSchema: {
        payload: z.union([z.record(z.unknown()), z.string().min(2)]),
        signature: z.string().min(1),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ payload, signature }) => {
      try {
        if (!cfg.ipnSecret) throw new Error('ZEN_IPN_SECRET is required to verify webhooks.');
        const parsed = typeof payload === 'string' ? JSON.parse(payload) as unknown : payload;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Webhook payload must be a JSON object.');
        }
        const valid = verifyIpnSignature(
          parsed as Record<string, unknown>,
          signature,
          cfg.ipnSecret,
          cfg.hashAlg,
        );
        return successResult(valid ? 'Webhook signature is valid.' : 'Webhook signature is invalid.', { valid });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
