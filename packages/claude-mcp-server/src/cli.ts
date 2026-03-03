/**
 * @voice-hub/claude-mcp-server
 *
 * CLI 入口
 */

import { VoiceHubMCPServer } from './index.js';

async function main(): Promise<void> {
  const runtimeUrl = process.env.VOICE_HUB_URL || 'http://localhost:3000';
  const apiKey = process.env.VOICE_HUB_API_KEY;

  const server = new VoiceHubMCPServer(runtimeUrl, apiKey);

  // 优雅关闭
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  await server.start();
}

main().catch((error) => {
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`Failed to start MCP server: ${detail}\n`);
  process.exit(1);
});
