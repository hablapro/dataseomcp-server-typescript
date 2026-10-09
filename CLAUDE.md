# CLAUDE.md — DataForSEO MCP Server

## Project Overview

MCP (Model Context Protocol) server for DataForSEO APIs. Lets AI assistants query SEO data (SERPs, keywords, backlinks, etc.) through a standardized interface. Deployed as a local stdio server, HTTP server, or Cloudflare Worker.

## Tech Stack

- **Runtime**: Node.js >= 20, TypeScript (ES2022, Node16 modules)
- **MCP SDK**: `@modelcontextprotocol/sdk` (server/mcp pattern)
- **Schema validation**: Zod
- **HTTP**: Express (for HTTP/SSE transports)
- **Worker**: Cloudflare Workers via `agents/mcp` (`McpAgent` pattern) + Wrangler
- **Build**: `tsc` — output to `build/main/` (main) and `build/worker/` (worker)

## Build & Run Commands

```bash
npm run build          # Compile TypeScript (main server)
npm run start          # Run stdio MCP server
npm run http           # Run HTTP server (port 3000)
npm run sse            # Run SSE HTTP server
npm run dev            # Watch mode (tsc --watch)

npm run worker:build   # Build Cloudflare Worker (prebuild + tsc)
npm run worker:dev     # Build + wrangler dev (local worker)
npm run worker:deploy  # Build + wrangler deploy (production)
```

## Project Structure

```
src/
├── core/                        # Shared core logic (used by both main and worker)
│   ├── client/
│   │   └── dataforseo.client.ts # HTTP client for DataForSEO API (Basic Auth, .ai suffix)
│   ├── config/
│   │   ├── modules.config.ts    # Module registry (AVAILABLE_MODULES, isModuleEnabled)
│   │   ├── global.tool.ts       # Global config (fullResponse, debug flags)
│   │   └── field-configuration.ts # Field-level response filtering
│   ├── modules/
│   │   ├── base.module.ts       # BaseModule abstract class
│   │   ├── base.tool.ts         # BaseTool abstract class (response formatting, validation)
│   │   ├── serp/                # SERP module (Google, Bing, YouTube)
│   │   ├── keywords-data/       # Keywords Data module (Google Ads, Trends)
│   │   ├── onpage/              # OnPage module (crawling, content parsing)
│   │   ├── dataforseo-labs/     # Labs module (keyword/competitor research)
│   │   ├── backlinks/           # Backlinks module (links, domains, spam scores)
│   │   ├── business-data-api/   # Business Data module (listings)
│   │   ├── domain-analytics/    # Domain Analytics module (technologies, whois)
│   │   ├── content-analysis/    # Content Analysis module (sentiment, trends)
│   │   └── ai-optimization/     # AI Optimization module
│   └── utils/
│       ├── module-loader.ts     # ModuleLoaderService — loads enabled modules
│       ├── field-filter.ts      # Nested field filtering utility
│       └── version.ts           # Package name/version exports
├── main/
│   ├── index.ts                 # Stdio MCP server entry point
│   ├── index-http.ts            # HTTP transport entry point
│   ├── index-sse-http.ts        # SSE transport entry point
│   └── cli.ts                   # CLI entry point (bin: dataforseo-mcp-server)
└── worker/
    ├── index-worker.ts          # Cloudflare Worker entry (McpAgent, landing page, routing)
    ├── version.worker.ts        # Worker-specific version (generated at build time)
    └── worker-configuration.d.ts # Wrangler-generated Env type definitions
```

## Architecture Patterns

### Module System

Each DataForSEO API maps to a **module** (`BaseModule` subclass). Modules are registered in `modules.config.ts` and loaded conditionally by `ModuleLoaderService` based on `ENABLED_MODULES` env var.

Available modules: `AI_OPTIMIZATION`, `SERP`, `KEYWORDS_DATA`, `ONPAGE`, `DATAFORSEO_LABS`, `BACKLINKS`, `BUSINESS_DATA`, `DOMAIN_ANALYTICS`, `CONTENT_ANALYSIS`

### Tool Pattern

Each tool extends `BaseTool` and implements:
- `getName()` — unique tool name
- `getDescription()` — human-readable description
- `getParams()` — Zod schema for input parameters
- `handle(params)` — async handler that calls `this.dataForSEOClient.makeRequest()` and returns formatted response via `this.validateAndFormatResponse()`

### API Client

`DataForSEOClient` appends `.ai` to endpoints by default (concise responses). Set `DATAFORSEO_FULL_RESPONSE=true` for full API responses. Uses Basic Auth with base64-encoded credentials.

### Response Filtering

Two layers: (1) tool-level default fields, (2) external JSON field config via `--configuration` flag. Field paths support dot notation for nested access.

## Adding a New Tool

1. Create `src/core/modules/<module>/tools/<tool-name>.tool.ts` extending `BaseTool`
2. Implement `getName()`, `getDescription()`, `getParams()`, `handle()`
3. Register in the module's `getTools()` method

## Adding a New Module

1. Create directory `src/core/modules/<name>/`
2. Create `<name>.module.ts` extending `BaseModule`
3. Add module name to `AVAILABLE_MODULES` in `src/core/config/modules.config.ts`
4. Add loader entry in `src/core/utils/module-loader.ts`

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATAFORSEO_USERNAME` | Yes | DataForSEO API username |
| `DATAFORSEO_PASSWORD` | Yes | DataForSEO API password |
| `ENABLED_MODULES` | No | Comma-separated module list (default: all) |
| `DATAFORSEO_FULL_RESPONSE` | No | `"true"` for full API responses |

## Key Files to Know

- `src/core/modules/base.tool.ts` — All tool behavior inherits from here
- `src/core/modules/base.module.ts` — All module behavior inherits from here
- `src/core/utils/module-loader.ts` — Module registration and loading
- `src/core/config/modules.config.ts` — Module name registry
- `src/core/client/dataforseo.client.ts` — Single HTTP client for all API calls
- `src/worker/index-worker.ts` — Cloudflare Worker entry with routing and landing page

## Deployment Targets

- **Local/stdio**: `npm run start` — direct MCP communication
- **HTTP**: `npm run http` — Express on port 3000, Basic Auth or env vars
- **Cloudflare Worker**: `npm run worker:deploy` — edge-distributed, uses Durable Objects (`McpAgent`)
- **Railway**: Configured via `railway.json` / `railway.toml` + `Dockerfile`

## HTTP API Usage (curl examples)

The `/mcp` and `/http` endpoints speak **JSON-RPC 2.0** (MCP Streamable HTTP transport), not REST. Auth is via Basic Auth header or falls back to env vars. The server is stateless (`sessionIdGenerator: undefined`).

### Tool Name Format

Tool names are flat strings: `<module>_<api_path_segments>`. Examples:

| Tool name | Module |
|---|---|
| `kw_data_google_ads_search_volume` | KEYWORDS_DATA |
| `dataforseo_labs_google_keyword_overview` | DATAFORSEO_LABS |
| `serp_organic_live_advanced` | SERP |
| `backlinks_backlinks` | BACKLINKS |

### Initialize session

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'user:pass' | base64)" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": { "name": "test-client", "version": "1.0.0" }
    }
  }'
```

### List available tools

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'user:pass' | base64)" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

### Keyword search volume (Google Ads)

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'user:pass' | base64)" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "kw_data_google_ads_search_volume",
      "arguments": {
        "keywords": ["seo tools", "keyword research"],
        "location_name": "United States",
        "language_code": "en"
      }
    }
  }'
```

### Keyword overview (Labs API — richer data)

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'user:pass' | base64)" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "dataforseo_labs_google_keyword_overview",
      "arguments": {
        "keywords": ["seo tools"],
        "location_name": "United States",
        "language_code": "en",
        "include_clickstream_data": false
      }
    }
  }'
```

### SERP organic results

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'user:pass' | base64)" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "serp_organic_live_advanced",
      "arguments": {
        "keyword": "best seo tools 2025",
        "search_engine": "google",
        "location_name": "United States",
        "language_code": "en",
        "depth": 10
      }
    }
  }'
```

### Response structure

Responses are JSON-RPC with tool output in `result.content[].text` (stringified JSON):

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "[ { \"keyword\": \"seo tools\", \"search_volume\": 12100, ... } ]"
      }
    ]
  }
}
```

## OpenClaw Setup

OpenClaw connects to MCP servers via the **mcp-hub skill** (native MCP support is not yet built in).

### 1. Install the mcp-hub skill

```bash
npx playbooks add skill openclaw/skills --skill mcp-hub
```

### 2. Configure DataForSEO MCP server

**Option A — Local stdio mode** (runs the server as a child process):

```json
{
  "mcpServers": {
    "dataforseo": {
      "command": "npx",
      "args": ["dataforseo-mcp-server"],
      "env": {
        "DATAFORSEO_USERNAME": "your_username",
        "DATAFORSEO_PASSWORD": "your_password",
        "ENABLED_MODULES": "SERP,KEYWORDS_DATA,DATAFORSEO_LABS,BACKLINKS"
      }
    }
  }
}
```

**Option B — Remote HTTP mode** (connect to a deployed Cloudflare Worker or HTTP server):

```json
{
  "mcpServers": {
    "dataforseo": {
      "url": "https://your-worker.your-subdomain.workers.dev/mcp",
      "transport": "streamable-http"
    }
  }
}
```

For HTTP mode, set DataForSEO credentials as secrets in the Cloudflare dashboard or as env vars on the HTTP server.

Once connected, OpenClaw's agent will see all DataForSEO tools (e.g. `kw_data_google_ads_search_volume`, `serp_organic_live_advanced`, `dataforseo_labs_google_keyword_overview`) and can invoke them directly.

## No Test Suite

There is currently no automated test suite. The `src/main/test.ts` file exists but is not wired up as a test runner.
