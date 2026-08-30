# Prism — Build Plan

Deadline: **17:00 GST, 30 Aug 2026 (strict).** Optimize for a flawless core demo over breadth.

## Architecture (one engine, five lenses)

```
Next.js (Vercel)  ──▶  Convex (realtime DB + actions + crons)
     UI/landing            │
                           ├─ action: runLens ──▶ Context.dev  (crawl + schema extraction → insight)
                           └─ cron:   monitor   ──▶ Context.dev  (re-crawl, change monitoring, emit events)
```
Context.dev does both the crawl AND the reasoning (schema-driven structured extraction fills the
insight fields). No separate LLM/inference service — exactly three partners, no extra spend.

Everything the UI shows comes from Convex **queries** (live subscriptions). Nothing is fetched client-side ad hoc. This is what makes the board update in realtime with zero refresh.

## Data model (Convex `schema.ts`)
- `sources` — { url, domain, title, lens, status, createdAt }
- `snapshots` — { sourceId, contentHash, extracted (json), raw, crawledAt }
- `changes` — { sourceId, fromSnapshotId, toSnapshotId, diffSummary, severity, createdAt }
- `analyses` — { sourceId, snapshotId, lens, kind, content (md/json), createdAt }
- `findings` — { sourceId, lens, type, title, detail, severity, url } (Audit + Hunt rows)
- `entities` — { canonicalKey, type, name, props (json), sourceIds[] } (Graph RAG nodes) + search index on `name`/text
- `edges` — { fromKey, toKey, rel, sourceId, props } (Graph RAG relationships)

## Convex functions
- `sources.add` (mutation), `sources.list` (query), `sources.get` (query)
- `runLens` (action): call Context.dev crawl + per-lens extraction schema → write snapshot + analysis/findings
- `changes.detect` (internal action): re-crawl → diff vs last snapshot → write change (+ extracted "whatChanged")
- `snapshots.list`, `analyses.list`, `findings.list`, `changes.list` (queries)
- `graph.upsert` (internal mutation): dedupe entities/edges from an extraction into `entities`/`edges`
- `graph.ask` (query): traverse + full-text search the graph, return subgraph + templated answer
- `graph.snapshot` (query): nodes/edges for the live force-directed viz
- `crons.ts`: every N min, re-run `changes.detect` for active Watch/Compare sources

## Graph RAG (the "Ask" lens) — no extra spend
- After every `runLens` extraction, call `graph.upsert` to fold entities (company/product/price/
  person/doc/change/opportunity) + relationships into the Convex graph, deduped by `canonicalKey`.
- Retrieval = graph traversal + Convex full-text search index on entity text. No embeddings / no model.
- Answer = structured synthesis over the retrieved subgraph + a live D3/force graph viz.
- Optional stretch (only if time + a model): generated prose answer over the retrieved subgraph.

## Context.dev integration (the differentiator)
- **Watch/Compare:** crawl page → structured extract → store; monitor for changes.
- **Audit:** crawl whole site (bounded depth) → collect pages/links/claims.
- **Research:** extract company/brand intel (product, pricing, team, news).
- **Hunt:** crawl a listing URL → structured-extract array of opportunities.
- Wrap the API in `convex/lib/context.ts` with one `crawl()` + one `extract()` helper so all lenses share it. Read docs first: https://docs.context.dev

## Reasoning layer (Context.dev extraction — no separate LLM)
- Each lens defines an extraction schema with insight fields Context.dev populates:
  - **Watch/Compare:** `whatChanged`, `whyItMatters`, `severity`
  - **Audit:** `findings[]` { type, title, detail, severity, url }
  - **Research:** memo fields { overview, product, pricing, team, news, risks }
  - **Hunt:** `opportunities[]` { title, url, fit, summary }
- Central helper `convex/lib/context.ts` → `extract(url, schema)` used by every lens.
- If Context.dev extraction can't populate a field, fall back to templated rendering of raw
  extracted content — never block the demo on a missing field.

## Devin task assignments ($200 credit — use it, be ready to explain)
Run these as **non-interactive Devin sessions** in parallel worktrees/branches while I build the core engine. Each is a self-contained, explainable chunk:
1. **Devin-A — Context.dev client + per-lens extraction schemas.** `convex/lib/context.ts` with `crawl()` + `extract(url, schema)` against the real Context.dev API, plus the Watch/Audit/Research/Compare/Hunt schemas. Deliver typed helpers + a smoke test.
2. **Devin-B — Lens UI components.** shadcn-based board components: WatchFeed, AuditFindings, ResearchMemo, CompareDiff, HuntBoard, and the **GraphView** (force-directed knowledge-graph viz for the Ask lens). Pure presentational, take Convex data as props.
3. **Devin-C — Landing page polish + copy.** Hero, five-lens explainer, live demo embed, "how it works," partner logos section.

I keep ownership of: Convex schema + core actions + wiring + the demo path (highest-risk, must not break). Devin does breadth. Every Devin session's output gets reviewed and integrated by me. Record what each session built for the submission write-up.

How to launch Devin non-interactively:
```
devin --permission-mode accept-edits -p "<task prompt>"     # local, this repo
# or a cloud session for parallel work: devin cloud ...
```

## Timeline (compressed, adjust to real clock)
- **T+0:00** Scaffold Next + Convex + shadcn. Landing page skeleton live. ← _we are here_
- **T+0:30** Convex schema + `sources.add/list` + realtime dashboard shell. Kick off Devin-A/B/C.
- **T+1:15** Context.dev `crawl()` working; **Watch** end-to-end (paste URL → snapshot → live board).
- **T+2:00** Claude `analyze` wired; Watch shows AI "what changed." **Audit** lens working.
- **T+2:45** Integrate Devin outputs (lens UIs, extractors). Research + Compare + Hunt as they land.
- **T+3:30** Convex cron change-detection → live change pops in feed. Two-browser realtime demo.
- **T+4:00** Polish landing, seed one pinned demo source, rehearse the 3-min path. Freeze.
- **Buffer** Fallbacks: pinned good source, Audit-on-any-static-site, no-crash empty states.

## Definition of done for the demo
Paste an unknown URL → live board fills → Claude analysis appears → a change fires live → all three partner tools visibly did real work.
