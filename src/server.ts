import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { ZenClient } from './client/http.js';
import { loadConfig, type ZenConfig } from './config.js';
import { endpoints } from './client/endpoints.js';
import { CURRENCIES } from './tools/currencies.js';
import { register as registerPayments } from './tools/payments.js';
import { register as registerRead } from './tools/read.js';
import { register as registerSensitive } from './tools/sensitive.js';
import { register as registerWebhooks } from './tools/webhooks.js';

export function buildServer(cfg: ZenConfig = loadConfig()): McpServer {
  const server = new McpServer({ name: 'zen-mcp', version: '0.1.0' });
  const client = new ZenClient(cfg);

  registerRead(server, client, cfg);
  registerPayments(server, client, cfg);
  registerSensitive(server, client, cfg);
  registerWebhooks(server, client, cfg);

  server.registerResource(
    'payment-methods',
    'zen://payment-methods',
    {
      title: 'ZEN payment methods',
      description: 'Snapshot of payment methods available to the configured ZEN terminal.',
      mimeType: 'application/json',
    },
    async (uri) => {
      try {
        const methods = await client.request<unknown[]>('GET', endpoints.paymentMethods());
        return { contents: [{ uri: uri.href, text: JSON.stringify(methods, null, 2) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { contents: [{ uri: uri.href, text: JSON.stringify({ error: message }, null, 2) }] };
      }
    },
  );

  server.registerResource(
    'currencies',
    'zen://currencies',
    {
      title: 'ZEN supported currencies',
      description: 'Currencies confirmed in the public ZEN documentation.',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [{ uri: uri.href, text: JSON.stringify(CURRENCIES, null, 2) }],
    }),
  );

  return server;
}
