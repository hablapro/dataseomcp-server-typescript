# Operations Guide

> **Current backend (2026-10-08):** the Cloudflare Worker at `https://dataforseo-mcp-worker.principal-e85.workers.dev` is the canonical DataForSEO MCP server (upstream v2.9.13, 89 tools). The Railway service is legacy and may be retired. Source repo: `/Users/rpro/dev/mcp/data4seo` (fork of dataforseo/mcp-server-typescript, stay on the v2.9.x line; upstream v3 is a rewrite with generic tools).
>
> Deploy the Worker (wrangler sees two Cloudflare accounts, so the account ID is required on every command):
>
> ```bash
> cd /Users/rpro/dev/mcp/data4seo
> CLOUDFLARE_ACCOUNT_ID=e85d12a89ad63b696720f497e3f1a662 npm run worker:deploy
> ```
>
> Credentials are Worker secrets, never `vars`. Set them from the local `.dev.vars` (chmod 600, git-ignored) with `wrangler secret bulk .dev.vars`; `secret put` prompts for input and silently stores an empty value when run from a non-interactive shell such as the `!` prompt.

## Server Status (Worker)

**Check health:**

```bash
curl https://dataforseo-mcp-worker.principal-e85.workers.dev/health
```

Expected response:

```json
{"status":"healthy","server":"dataforseo-mcp-server (Worker)","version":"2.9.13","timestamp":"..."}
```

**Test MCP protocol:**

```bash
curl -X POST https://dataforseo-mcp-worker.principal-e85.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```

**List all tools:**

```bash
curl -X POST https://dataforseo-mcp-worker.principal-e85.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

## Railway Management (legacy)

### View Deployment Status

```bash
# List deployments
railway deployment list --service c3c9dda3-3cf4-47bc-8ac0-2570f2e5e701

# Check logs
railway deployment logs --service c3c9dda3-3cf4-47bc-8ac0-2570f2e5e701
```

### Trigger Redeployment

Push to GitHub — Railway auto-deploys. Or manually:

```bash
railway deployment trigger --service c3c9dda3-3cf4-47bc-8ac0-2570f2e5e701
```

### Environment Variables

View/set via Railway dashboard or CLI:

```bash
# List current vars
railway service info --service c3c9dda3-3cf4-47bc-8ac0-2570f2e5e701

# Set a variable
railway variable set MCP_API_KEY=your_key
```

### IDs Reference

| Resource    | ID                                     |
| ----------- | -------------------------------------- |
| Project     | `bf74aea5-319d-48f6-95c9-be7ea0980a3e` |
| Service     | `c3c9dda3-3cf4-47bc-8ac0-2570f2e5e701` |
| Environment | `d406da7e-8933-4f62-a245-df5d058a7218` |

## Updating the Server

All code changes are in the source repo:

```bash
cd /Users/rpro/dev/mcp/data4seo

# Pull upstream changes (v2.9.x tags only)
git fetch https://github.com/dataforseo/mcp-server-typescript.git 'refs/tags/*:refs/tags/*'
git merge --no-commit v2.9.<latest>

# Build and validate
npm run build
npm run validate

# Test locally
node build/main/main/cli.js sse
# In another terminal:
curl http://localhost:3000/health

# Deploy the Worker
CLOUDFLARE_ACCOUNT_ID=e85d12a89ad63b696720f497e3f1a662 npm run worker:deploy
```

## Controlling Modules

Restrict which tool modules load by setting `ENABLED_MODULES`:

```bash
ENABLED_MODULES=SERP,KEYWORDS_DATA,DATAFORSEO_LABS
```

Available modules:

- `AI_OPTIMIZATION` (13 tools)
- `SERP` (7 tools)
- `KEYWORDS_DATA` (7 tools)
- `ONPAGE` (3 tools)
- `DATAFORSEO_LABS` (21 tools)
- `BACKLINKS` (20 tools) — requires separate DataForSEO subscription
- `BUSINESS_DATA` (1 tool)
- `DOMAIN_ANALYTICS` (4 tools)
- `CONTENT_ANALYSIS` (3 tools)

If unset, all modules load.

## Authentication

### DataForSEO API Credentials

Set in environment (shell or Railway):

```bash
export DATAFORSEO_USERNAME=your_username
export DATAFORSEO_PASSWORD=your_password
```

### MCP Server Auth (optional)

To require an API key for incoming MCP requests:

1. Set `MCP_API_KEY=your_secret` in Railway env vars
2. Clients must send `X-API-Key: your_secret` header
3. The `tools/list` endpoint remains accessible without auth

## Troubleshooting

### Server returns 500

Check Railway logs for the specific error. Common causes:

- Invalid or expired DataForSEO credentials
- Missing environment variables
- Module trying to call an API not in your DataForSEO plan

### Tools not appearing in Claude

1. Verify health endpoint responds: `curl .../health`
2. Check `~/.claude.json` has `"type": "http"` and URL ending in `/mcp`
3. Restart Claude Code (`/quit` then relaunch)
4. DataForSEO tools are **deferred** — they don't load into context until you call `ToolSearch`. Use a keyword to find the tool you need.

#### ToolSearch Keywords Reference

All 79 tools prefixed with `mcp__dataforseo__`. Search by keyword:

**AI Optimization (13 tools):**

| Search keyword | Tool name | What it does |
| --- | --- | --- |
| `ai opt kw` | `ai_opt_kw_data_loc_and_lang` | Locations/languages for AI keyword data |
| `ai keyword volume` | `ai_optimization_keyword_data_search_volume` | Keyword search volume in AI LLMs |
| `llm models` | `ai_optimization_llm_models` | Available LLM models list |
| `llm response` | `ai_optimization_llm_response` | Structured responses from AI models |
| `llm mentions filter` | `ai_optimization_llm_mentions_filters` | LLM mentions available filters |
| `llm ment loc` | `ai_opt_llm_ment_loc_and_lang` | LLM mentions locations/languages |
| `llm ment search` | `ai_opt_llm_ment_search` | Search LLM mentions |
| `llm ment agg` | `ai_opt_llm_ment_agg_metrics` | LLM mentions aggregated metrics |
| `llm ment cross` | `ai_opt_llm_ment_cross_agg_metrics` | LLM mentions cross-aggregated metrics |
| `llm top domains` | `ai_opt_llm_ment_top_domains` | Top domains in LLM mentions |
| `llm top pages` | `ai_opt_llm_ment_top_pages` | Top pages in LLM mentions |
| `chatgpt scraper` | `ai_optimization_chat_gpt_scraper` | Scrape ChatGPT responses |
| `chatgpt locations` | `ai_optimization_chat_gpt_scraper_locations` | ChatGPT scraper locations |

**SERP (7 tools):**

| Search keyword | Tool name | What it does |
| --- | --- | --- |
| `serp organic` | `serp_organic_live_advanced` | Google/Bing/Yahoo organic results |
| `serp locations` | `serp_locations` | Available SERP locations |
| `youtube locations` | `serp_youtube_locations` | YouTube locations |
| `youtube organic` | `serp_youtube_organic_live_advanced` | YouTube search results |
| `youtube video info` | `serp_youtube_video_info_live_advanced` | YouTube video metadata |
| `youtube comments` | `serp_youtube_video_comments_live_advanced` | YouTube video comments |
| `youtube subtitles` | `serp_youtube_video_subtitles_live_advanced` | YouTube video subtitles |

**Keywords Data (7 tools):**

| Search keyword | Tool name | What it does |
| --- | --- | --- |
| `google ads locations` | `kw_data_google_ads_locations` | Google Ads locations |
| `google ads volume` | `kw_data_google_ads_search_volume` | Google Ads search volume |
| `trends demography` | `kw_data_dfs_trends_demography` | Trend demographics |
| `trends subregion` | `kw_data_dfs_trends_subregion_interests` | Subregion interests |
| `trends explore` | `kw_data_dfs_trends_explore` | Trend exploration |
| `trends categories` | `kw_data_google_trends_categories` | Google Trends categories |
| `google trends` | `kw_data_google_trends_explore` | Google Trends explore |

**OnPage (3 tools):**

| Search keyword | Tool name | What it does |
| --- | --- | --- |
| `content parsing` | `on_page_content_parsing` | Page content extraction |
| `instant pages` | `on_page_instant_pages` | Page SEO analysis |
| `lighthouse` | `on_page_lighthouse` | Lighthouse audit |

**DataForSEO Labs (21 tools):**

| Search keyword | Tool name | What it does |
| --- | --- | --- |
| `keyword overview` | `dataforseo_labs_google_keyword_overview` | Keyword metrics overview |
| `keyword ideas` | `dataforseo_labs_google_keyword_ideas` | Keyword ideas |
| `keyword suggestions` | `dataforseo_labs_google_keyword_suggestions` | Keyword suggestions |
| `related keywords` | `dataforseo_labs_google_related_keywords` | Related keywords |
| `keywords for site` | `dataforseo_labs_google_keywords_for_site` | Keywords a site ranks for |
| `bulk difficulty` | `dataforseo_labs_bulk_keyword_difficulty` | Bulk keyword difficulty |
| `search intent` | `dataforseo_labs_search_intent` | Search intent classification |
| `historical keyword` | `dataforseo_labs_google_historical_keyword_data` | Historical keyword data |
| `ranked keywords` | `dataforseo_labs_google_ranked_keywords` | Domain's ranked keywords |
| `competitors domain` | `dataforseo_labs_google_competitors_domain` | Domain competitors |
| `domain rank` | `dataforseo_labs_google_domain_rank_overview` | Domain rank overview |
| `historical rank` | `dataforseo_labs_google_historical_rank_overview` | Historical rank overview |
| `domain intersection` | `dataforseo_labs_google_domain_intersection` | Domain keyword intersection |
| `page intersection` | `dataforseo_labs_google_page_intersection` | Page keyword intersection |
| `serp competitors` | `dataforseo_labs_google_serp_competitors` | SERP competitors |
| `subdomains` | `dataforseo_labs_google_subdomains` | Domain subdomains |
| `relevant pages` | `dataforseo_labs_google_relevant_pages` | Relevant pages |
| `bulk traffic` | `dataforseo_labs_bulk_traffic_estimation` | Bulk traffic estimation |
| `top searches` | `dataforseo_labs_google_top_searches` | Top searches |
| `labs filters` | `dataforseo_labs_available_filters` | Available filters |
| `historical serp` | `dataforseo_labs_google_historical_serp` | Historical SERP data |

**Backlinks (20 tools):**

| Search keyword | Tool name | What it does |
| --- | --- | --- |
| `backlinks backlinks` | `backlinks_backlinks` | Backlinks list |
| `backlinks anchors` | `backlinks_anchors` | Anchor text distribution |
| `referring domains` | `backlinks_referring_domains` | Referring domains |
| `referring networks` | `backlinks_referring_networks` | Referring networks |
| `backlinks summary` | `backlinks_summary` | Backlink profile summary |
| `backlinks competitors` | `backlinks_competitors` | Backlink competitors |
| `backlinks domain intersection` | `backlinks_domain_intersection` | Domain backlink intersection |
| `backlinks domain pages` | `backlinks_domain_pages` | Domain pages with backlinks |
| `domain pages summary` | `backlinks_domain_pages_summary` | Domain pages summary |
| `backlinks page intersection` | `backlinks_page_intersection` | Page backlink intersection |
| `bulk backlinks` | `backlinks_bulk_backlinks` | Bulk backlinks |
| `bulk referring` | `backlinks_bulk_referring_domains` | Bulk referring domains |
| `bulk ranks` | `backlinks_bulk_ranks` | Bulk domain ranks |
| `bulk spam` | `backlinks_bulk_spam_score` | Bulk spam scores |
| `bulk new lost backlinks` | `backlinks_bulk_new_lost_backlinks` | Bulk new/lost backlinks |
| `bulk new lost referring` | `backlinks_bulk_new_lost_referring_domains` | Bulk new/lost referring domains |
| `bulk pages summary` | `backlinks_bulk_pages_summary` | Bulk pages summary |
| `timeseries summary` | `backlinks_timeseries_summary` | Backlink timeseries |
| `timeseries new lost` | `backlinks_timeseries_new_lost_summary` | New/lost backlinks over time |
| `backlinks filters` | `backlinks_available_filters` | Available filters |

**Business Data (1 tool):**

| Search keyword | Tool name | What it does |
| --- | --- | --- |
| `business listings` | `business_data_business_listings_search` | Business listings search |

**Domain Analytics (4 tools):**

| Search keyword | Tool name | What it does |
| --- | --- | --- |
| `whois overview` | `domain_analytics_whois_overview` | Whois data |
| `whois filters` | `domain_analytics_whois_available_filters` | Whois filters |
| `domain technologies` | `domain_analytics_technologies_domain_technologies` | Technology stack |
| `technologies filters` | `domain_analytics_technologies_available_filters` | Technology filters |

**Content Analysis (3 tools):**

| Search keyword | Tool name | What it does |
| --- | --- | --- |
| `content search` | `content_analysis_search` | Content/citation search |
| `content summary` | `content_analysis_summary` | Content analysis summary |
| `phrase trends` | `content_analysis_phrase_trends` | Phrase trends over time |

### SSE connection drops

The SSE transport has a 30-second inactivity timeout and auto-cleanup every 60 seconds. This is normal — clients reconnect automatically. For persistent connections, use the Streamable HTTP endpoint (`/mcp`) instead.

### Build fails on Railway

Check the Dockerfile uses `npm install` (not `npm ci`). The upstream repo doesn't maintain a `package-lock.json`.

### Backlinks tools return errors

The Backlinks API requires a separate subscription activation on your DataForSEO account. Contact DataForSEO support to enable it.
