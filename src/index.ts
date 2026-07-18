#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { loadConfig } from './config.js';
import { buildServer } from './server.js';

async function main(): Promise<void> {
  const cfg = loadConfig();
  if (!cfg.mock && !cfg.apiKey) {
    console.error('Warning: ZEN_API_KEY is not configured; API-backed tools will return errors.');
  }

  const server = buildServer(cfg);
  await server.connect(new StdioServerTransport());
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to start zen-mcp: ${message}`);
  process.exit(1);
}
