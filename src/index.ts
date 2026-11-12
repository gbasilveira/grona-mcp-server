#!/usr/bin/env node
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { GronaClient } from './client.js';
import { loadConfig } from './config.js';
import { createServer } from './server.js';

try {
  const config = loadConfig();
  const handle = serveStdio(() => createServer(new GronaClient(config)), { onerror: () => { process.stderr.write('Grona MCP transport error.\n'); } });
  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true;
    void handle.close().finally(() => { process.exitCode = 0; });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
} catch (error) {
  const diagnostic = error instanceof Error && error.message.startsWith('Invalid Grona configuration:') ? error.message : 'Check GRONA_* environment configuration.';
  process.stderr.write(`Grona MCP could not start. ${diagnostic}\n`);
  process.exitCode = 1;
}
