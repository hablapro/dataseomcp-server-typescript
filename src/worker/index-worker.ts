import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { DataForSEOClient, buildBasicAuthHeader } from '../core/client/dataforseo.client.js';
import { EnabledModulesSchema } from '../core/config/modules.config.js';
import { BaseModule, ToolDefinition } from '../core/modules/base.module.js';
import { ModuleLoaderService } from '../core/utils/module-loader.js';
import { version, name } from './version.worker.js';

/**
 * DataForSEO MCP Server for Cloudflare Workers
 * 
 * This server provides MCP (Model Context Protocol) access to DataForSEO APIs
 * through a Cloudflare Worker runtime using the agents/mcp pattern.
 */

// Server metadata
const SERVER_NAME = `${name} (Worker)`;
const SERVER_VERSION = version;
globalThis.__PACKAGE_VERSION__ = version;
globalThis.__PACKAGE_NAME__ = name;
/**
 * DataForSEO MCP Agent for Cloudflare Workers
 */
export class DataForSEOMcpAgent extends McpAgent {
  server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  constructor(ctx: DurableObjectState, protected env: Env){
    super(ctx, env);
  }

  async init() {
    const workerEnv = this.env || (globalThis as any).workerEnv;
    if (!workerEnv) {
      throw new Error(`Worker environment not available`);
    }

    const dataForSEOClient = new DataForSEOClient({
      authHeader: buildBasicAuthHeader(
        workerEnv.DATAFORSEO_USERNAME || "",
        workerEnv.DATAFORSEO_PASSWORD || "",
      ),
    });
    
    // Parse enabled modules from environment
    const enabledModules = EnabledModulesSchema.parse(workerEnv.ENABLED_MODULES);
    
    // Initialize and load modules
    const modules: BaseModule[] = ModuleLoaderService.loadModules(dataForSEOClient, enabledModules);
    
    const enabledPromptsRaw = (workerEnv as unknown as Record<string, string>)['ENABLED_PROMPTS'] as string | undefined;
    const enabledPrompts = enabledPromptsRaw ? enabledPromptsRaw.split(',').map(name => name.trim()) : [];

    // Register tools and prompts from all modules
    modules.forEach(module => {
      const tools = module.getTools();
      Object.entries(tools).forEach(([name, tool]) => {
        const typedTool = tool as ToolDefinition;
        const schema = z.object(typedTool.params);
        this.server.registerTool(
          name,
          {
            title: typedTool.title,
            description: typedTool.description,
            inputSchema: schema.shape,
            annotations: typedTool.annotations,
          },
          (args) => typedTool.handler(args)
        );
      });

      const prompts = module.getPrompts();
      const allowedPrompts = enabledPrompts.length === 0
        ? prompts
        : Object.fromEntries(Object.entries(prompts).filter(([promptName]) => enabledPrompts.includes(promptName)));

      Object.entries(allowedPrompts).forEach(([name, prompt]) => {
        this.server.registerPrompt(
          name,
          {
            description: prompt.description,
            argsSchema: prompt.params,
          },
          prompt.handler
        );
      });
    });
  }
}

/**
 * Creates a JSON-RPC error response
 */
function createErrorResponse(code: number, message: string): Response {
  return new Response(JSON.stringify({
    jsonrpc: "2.0",
    error: { code, message },
    id: null
  }), {
    status: code === -32001 ? 401 : 400,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Creates an HTML landing page for the MCP server
 */
function createLandingPage(baseUrl: string): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DataForSEO MCP Server</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 800px;
      width: 100%;
      padding: 40px;
    }

    .header {
      display: flex;
      align-items: center;
      margin-bottom: 30px;
      gap: 15px;
    }

    .icon {
      font-size: 40px;
    }

    .title {
      font-size: 32px;
      font-weight: 700;
      color: #667eea;
      margin: 0;
    }

    .subtitle {
      color: #666;
      margin-top: 8px;
      font-size: 16px;
    }

    .status-box {
      background: #fef3cd;
      border-left: 4px solid #ffc107;
      padding: 15px 20px;
      border-radius: 4px;
      margin-bottom: 30px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .status-icon {
      font-size: 20px;
    }

    .status-text {
      color: #856404;
      font-weight: 500;
    }

    h2 {
      font-size: 20px;
      color: #333;
      margin-top: 30px;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .endpoint {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      padding: 12px 15px;
      margin-bottom: 10px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 13px;
      color: #333;
      word-break: break-all;
    }

    .endpoint-label {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      margin-right: 8px;
      margin-bottom: 8px;
    }

    .endpoint-description {
      color: #666;
      font-family: inherit;
      font-size: 14px;
      margin-bottom: 8px;
    }

    .endpoint-group {
      margin-bottom: 20px;
    }

    .tools-list {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      padding: 15px;
    }

    .tools-list li {
      margin-left: 20px;
      margin-bottom: 8px;
      color: #333;
    }

    .tools-list strong {
      color: #667eea;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">🔍</div>
      <div>
        <h1 class="title">DataForSEO MCP Server</h1>
        <p class="subtitle">Cloud-based Model Context Protocol server for DataForSEO APIs</p>
      </div>
    </div>

    <div class="status-box">
      <div class="status-icon">🚀</div>
      <div class="status-text">Status: Server is running and ready to accept connections!</div>
    </div>

    <h2>📡 Available Endpoints</h2>

    <div class="endpoint-group">
      <div class="endpoint-description">
        <strong>Main MCP Endpoint (Streamable HTTP)</strong>
      </div>
      <div class="endpoint">
        <span class="endpoint-label">MCP</span>
        <strong>POST</strong> ${baseUrl}/mcp
      </div>
    </div>

    <div class="endpoint-group">
      <div class="endpoint-description">
        <strong>Alternative HTTP Endpoint</strong>
      </div>
      <div class="endpoint">
        <span class="endpoint-label">MCP</span>
        <strong>POST</strong> ${baseUrl}/http
      </div>
    </div>

    <div class="endpoint-group">
      <div class="endpoint-description">
        <strong>SSE Streaming Endpoint</strong>
      </div>
      <div class="endpoint">
        <span class="endpoint-label">MCP</span>
        <strong>GET/POST</strong> ${baseUrl}/sse
      </div>
    </div>

    <div class="endpoint-group">
      <div class="endpoint-description">
        <strong>Health Check Endpoint</strong>
      </div>
      <div class="endpoint">
        <span class="endpoint-label">INFO</span>
        <strong>GET</strong> ${baseUrl}/health
      </div>
    </div>

    <h2>🛠 Available Modules</h2>

    <div class="tools-list">
      <ul>
        <li><strong>SERP</strong> - Real-time search results (Google, Bing, YouTube)</li>
        <li><strong>KEYWORDS_DATA</strong> - Keyword research and trends</li>
        <li><strong>ONPAGE</strong> - Website crawling and analysis</li>
        <li><strong>DATAFORSEO_LABS</strong> - Keyword and competitor analysis</li>
        <li><strong>BACKLINKS</strong> - Backlink analysis and metrics</li>
        <li><strong>BUSINESS_DATA</strong> - Business listings and reviews</li>
        <li><strong>DOMAIN_ANALYTICS</strong> - Technology detection and Whois data</li>
        <li><strong>CONTENT_ANALYSIS</strong> - Brand monitoring and sentiment</li>
        <li><strong>AI_OPTIMIZATION</strong> - AI-optimized data processing</li>
      </ul>
    </div>

    <p style="margin-top: 30px; color: #999; font-size: 13px; text-align: center;">
      Version ${SERVER_VERSION} • Powered by Cloudflare Workers
    </p>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

function hasValidKey(request: Request, env: Env): boolean {
  const expected = (env as any).MCP_API_KEY as string | undefined;
  if (!expected) return false;
  const got = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const a = new TextEncoder().encode(got), b = new TextEncoder().encode(expected);
  return a.byteLength === b.byteLength && (crypto.subtle as any).timingSafeEqual(a, b);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Store environment in global context for McpAgent access
    (globalThis as any).workerEnv = env;

    // Landing page
    if ((url.pathname === '/' || url.pathname === '') && request.method === 'GET') {
      const baseUrl = url.origin;
      return createLandingPage(baseUrl);
    }

    // Health check endpoint
    if (url.pathname === '/health' && request.method === 'GET') {
      return new Response(JSON.stringify({
        status: 'healthy',
        server: SERVER_NAME,
        version: SERVER_VERSION,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    // Bearer gate on every MCP route (Railway breach follow-up, 2026-10-22). Fails closed if MCP_API_KEY is unset.
    if (['/mcp', '/http', '/sse', '/messages', '/sse/message'].includes(url.pathname) && !hasValidKey(request, env)) {
      return new Response('Unauthorized', { status: 401 });
    }
    // Check if credentials are configured
    if (!env.DATAFORSEO_USERNAME || !env.DATAFORSEO_PASSWORD) {
      if (['/mcp','/http', '/sse', '/messages','/sse/message'].includes(url.pathname)) {
        return createErrorResponse(-32001, "DataForSEO credentials not configured in worker environment variables");
      }
    }
    // MCP endpoints using McpAgent pattern
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return DataForSEOMcpAgent.serveSSE("/sse").fetch(request, env, ctx);
    }

    if (url.pathname === "/mcp" || url.pathname == '/http') {
      return DataForSEOMcpAgent.serve("/mcp").fetch(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  },
};