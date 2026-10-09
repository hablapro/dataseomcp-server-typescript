# Known bugs

Environment bugs and their workarounds, recorded once. Consult before debugging.

## 2026-10-08: serp_organic_live_advanced returns 50000 Internal Server Error via the Railway MCP

Symptom: every `serp_organic_live_advanced` call through the Railway deployment (`dataforseo-mcp-server-production-8d37.up.railway.app`, v2.8.5) returns "API Error: Internal Server Error. (Code: 50000)". Fifteen calls plus two retries on 2026-10-08, all keywords. Labs tools (`keyword_overview`, `historical_serp`, `serp_competitors`, `ranked_keywords`) work through the same client.

Verified: the same request (google organic live advanced, United States, en, depth 10, desktop) succeeds from the DataForSEO dashboard at 2026-10-09 01:42 UTC. The endpoint is up; the fault is in the request the MCP sends.

Likely cause: `DataForSEOClient.makeRequest` appends `.ai` to every endpoint unless `DATAFORSEO_FULL_RESPONSE=true` or the tool passes `forceFull`. The live SERP tool does neither, so the MCP calls `/v3/serp/google/organic/live/advanced.ai`. Not confirmed directly (no local credentials; they live on Railway).

Workaround used: `dataforseo_labs_google_historical_serp` for indexed SERP snapshots, plus `dataforseo_labs_google_serp_competitors`. Snapshots lag live by weeks; note the date in any analysis.

Fix options, Renzo's call: (a) set `DATAFORSEO_FULL_RESPONSE=true` on the Railway service, which switches every tool to full responses (larger payloads); (b) pass `forceFull=true` in `serp-organic-live-advanced.tool.ts` and redeploy; (c) confirm the hypothesis first by calling the `.ai` endpoint from the dashboard.

## 2026-10-09 update: live SERP recovered on Railway; the Worker's auth is misconfigured

- `serp_organic_live_advanced` through the Railway MCP returned results at 2026-10-09 02:10 UTC with no change deployed (Railway still v2.8.5, repo unchanged on origin). The 50000 was a DataForSEO-side outage of that endpoint, not the `.ai` suffix. The forceFull patch in the repo is harmless and stays as belt and braces; it is not required.
- The Cloudflare Worker `dataforseo-mcp-worker` (account principal-e85) returns HTTP 401 on every tool. Its live version (ec8306cc, 2026-02-11) binds `DATAFORSEO_PASSWORD` as a plaintext variable whose value is a base64 string beginning with the login (a pre-built Basic auth token), not the password. The client base64-encodes `login:password` itself, so the token gets encoded twice and DataForSEO rejects it. It has been broken since that February deploy; nobody noticed because Claude Code sessions used Railway. The Worker also runs the February code (65 tools, no Lighthouse, no AI Optimization family).
- No deployment reached the Worker on 2026-10-08/09 from this machine (no `deploy` in local wrangler logs; newest Worker version is still February). Secrets list on the Worker is empty.
- Fix (Renzo, Cloudflare dashboard or wrangler on account e85d12a8…): delete the plaintext `DATAFORSEO_USERNAME` and `DATAFORSEO_PASSWORD` vars, set both as secrets with the real values (`wrangler secret put`), remove the placeholder `vars` lines from `wrangler.jsonc` so a deploy cannot overwrite them, then `npm run worker:deploy`. Until then the Railway MCP stays the working backend and the pending-config swap must not run.
