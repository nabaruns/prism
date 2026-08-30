# Prism

**One URL. Five lenses on the web.**

Prism is an AI web-intelligence agent. Point it at any URL and it can **Watch** (track changes), **Audit** (find stale/broken/contradictory content), **Research** (company memo), **Compare** (competitor snapshot), and **Hunt** (pull opportunities from a listing). Everything it finds folds into one **knowledge graph** you can **Ask** (Graph RAG).

Built at the Collabute × TheBlock hackathon (Dubai, 30 Aug 2026) on three partner technologies:

- **[Context.dev](https://context.dev)** — the crawl **and** reasoning layer. Each lens calls `POST /v1/web/extract` with a per-lens JSON schema and gets structured insight back; `scrape/markdown` powers change detection; `brand/retrieve` powers Research. No separate LLM.
- **[Convex](https://convex.dev)** — the realtime backend. Schema, mutations, actions, live queries, and a cron. The board streams updates with no polling; the Telegram bot's alerts ride the same live queries.
- **[Devin](https://devin.ai)** — the AI engineer that built parts of the product from scoped specs (`docs/devin-*.md`).

## One engine, five lenses

```
Source (URL)  ──Context.dev──▶  snapshot + structured extraction  ──Convex──▶  live board
   crawl · extract · monitor        (per-lens insight fields)          + Ask (Graph RAG)
```

## Run it

```bash
pnpm install
npx convex dev            # realtime backend (terminal 1)
pnpm dev                  # Next.js app at http://localhost:3000  (terminal 2)
```

Set these in the Convex deployment: `CONTEXT_API_KEY`, `TELEGRAM_BOT_TOKEN`, and the auth
keys (`npx @convex-dev/auth`). Sign in at `/app`. The Telegram bot is a Convex HTTP-action
webhook — register it once with `setWebhook` to `<CONVEX_SITE_URL>/telegram`, then link a chat
from the app's **Connect Telegram** button.

## Layout

| Path | What |
|------|------|
| `convex/schema.ts` | Data model: sources, snapshots, changes, analyses, findings, entities, edges |
| `convex/lib/context.ts` | Context.dev client (extract / scrape / brand) |
| `convex/lib/lensSchemas.ts` | Per-lens extraction schemas — the "reasoning" |
| `convex/sources.ts` | `add` mutation + `runLens` engine action + change detection |
| `convex/graph.ts` | Knowledge-graph ingest + Graph RAG `ask` |
| `convex/monitor.ts`, `convex/crons.ts` | Autonomous re-crawl of watched sources |
| `src/app/app/page.tsx` | Realtime dashboard (board + Ask) |
| `src/components/GraphView.tsx` | Force-directed knowledge-graph viz |
| `scripts/telegram-bot.mjs` | Telegram chat interface |

See `docs/` for the PRD, plan, and submission write-up.
