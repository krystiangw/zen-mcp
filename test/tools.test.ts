import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';
import { buildServer } from '../src/server.js';

describe('ZEN MCP tools in mock mode', () => {
  let client: Client;
  let server: ReturnType<typeof buildServer>;

  beforeEach(async () => {
    client = new Client({ name: 'zen-mcp-test', version: '0.1.0' });
    server = buildServer(loadConfig({ ZEN_MOCK: '1' }));
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  });

  afterEach(async () => {
    await Promise.all([client.close(), server.close()]);
  });

  it('lists payment methods', async () => {
    const result = await client.callTool({ name: 'list_payment_methods', arguments: {} });
    expect(result.isError).not.toBe(true);
    expect((result.structuredContent as { items: unknown[] }).items.length).toBeGreaterThan(0);
  });

  it('creates a structured payment link', async () => {
    const result = await client.callTool({
      name: 'create_payment_link',
      arguments: { amount: '12.50', currency: 'EUR', merchantTransactionId: 'order-123' },
    });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      id: 'plink_mock_001',
      url: expect.stringContaining('https://'),
    });
  });

  it('returns the documented currencies', async () => {
    const result = await client.callTool({ name: 'list_supported_currencies', arguments: {} });
    expect(result.isError).not.toBe(true);
    expect((result.structuredContent as { items: string[] }).items).toContain('EUR');
  });

  it.each([
    ['bad currency', { amount: '10.00', currency: 'XYZ', merchantTransactionId: 'order-1' }],
    ['string amount with >2 decimals', { amount: '10.999', currency: 'EUR', merchantTransactionId: 'order-1' }],
    ['numeric amount with >2 decimals', { amount: 10.999, currency: 'EUR', merchantTransactionId: 'order-1' }],
    ['zero string amount', { amount: '0.00', currency: 'EUR', merchantTransactionId: 'order-1' }],
    ['zero integer string amount', { amount: '0', currency: 'EUR', merchantTransactionId: 'order-1' }],
  ])('rejects %s', async (_label, args) => {
    const result = await client.callTool({ name: 'create_payment_link', arguments: args });
    expect(result.isError).toBe(true);
  });

  it('rejects a transaction lookup without an ID', async () => {
    const result = await client.callTool({ name: 'get_transaction', arguments: {} });
    expect(result.isError).toBe(true);
  });
});

describe('ZEN MCP tools without credentials', () => {
  it('return an MCP error instead of crashing the server', async () => {
    const client = new Client({ name: 'zen-mcp-no-key-test', version: '0.1.0' });
    const server = buildServer(loadConfig({}));
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    try {
      const result = await client.callTool({ name: 'list_payment_methods', arguments: {} });
      expect(result.isError).toBe(true);
    } finally {
      await Promise.all([client.close(), server.close()]);
    }
  });
});
