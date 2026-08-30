# Prism — Product Requirements Document

**One URL. Five lenses on the web.**

Prism is an AI web-intelligence agent. Point it at any URL or domain and it can **Watch**, **Audit**, **Research**, **Compare**, or **Hunt** — five agent skills powered by one engine: crawl and understand the web with **Context.dev** (AI extraction + brand intelligence + change monitoring) → stream results in realtime with **Convex** → all built by **Devin**.

Built for the Collabute × TheBlock hackathon (Dubai, 30 Aug 2026). Uses exactly the three partner tools, each load-bearing: **Devin** (the AI engineer that built the product), **Convex** (realtime backend), **Context.dev** (the runtime web-intelligence layer). No separate LLM key or extra paid service — Context.dev's extraction *is* the reasoning layer.

---

## Problem
The web is the world's biggest live dataset, but it's unstructured, un-subscribable, and changes silently. People manually re-check competitor pages, re-read docs, re-audit their own sites, and copy-paste research. There is no single agent you can point at a URL and say "keep an eye on this and tell me what matters."

## Target users
Founders, growth/marketing teams, analysts, VCs, developers, and ops teams — anyone whose job involves watching or researching things on the web.

## The core insight
All five ideas are the **same pipeline** with a different prompt + output shape:

```
Source (URL/domain)  ──Context.dev──▶  Snapshot + structured extraction  ──Convex──▶  Realtime UI
   crawl · AI extract · monitor            (whatChanged, findings[],
                                            memo, opportunities[] ...)
```

The "reasoning" is Context.dev's structured extraction: we hand it a per-lens schema
(e.g. `whatChanged`, `whyItMatters`, `severity`, `findings[]`, `opportunities[]`) and it
populates the insight fields. No separate LLM/inference key.

So we build **one engine** and **five lenses** on top. That is the whole technical and product story.

## The five lenses
| Lens | What it does | Context.dev role | Output |
|------|--------------|------------------|--------|
| **Watch** | Turn any page into a live feed. Detect changes, alert. | Crawl + change monitoring | Timeline of diffs, each with an AI "what changed & why it matters" |
| **Audit** | "Does your site still tell the truth?" | Full-site crawl | Findings: stale pricing, dead links, contradictions, outdated dates |
| **Research** | Analyst-in-a-box for any company. | Site + team + news extraction | Structured memo (overview, product, pricing, team, risks) |
| **Compare** | Track a competitor's pricing/docs/site. | Crawl two+ sources | Side-by-side diff + AI impact summary |
| **Hunt** | Find opportunities (grants/RFPs/jobs) from listing sites. | Crawl + structured extraction | Ranked, matched opportunity board |
| **Ask** | Query everything Prism has seen across all sources (Graph RAG). | Feeds the graph from every extraction | Graph-traversal answer + live knowledge-graph viz |

## Knowledge graph + Graph RAG (the "Ask" lens)
Every Context.dev extraction, from any lens, drops **entities** (company, product, price, person,
doc, change, opportunity) and **relationships** into a Convex-backed knowledge graph that grows as
Prism crawls more of the web. This turns a pile of one-off crawls into a connected, queryable brain.

- **Nodes/edges** stored in Convex (`entities`, `edges`), deduped by canonical key.
- **Retrieval:** graph traversal + Convex full-text **search indexes** over entity text. No embeddings,
  no external model, no spend.
- **Answer synthesis (v1):** assemble the retrieved subgraph into a structured, templated answer +
  a live force-directed graph viz. (Optional later: generated prose — the only step that wants an LLM.)
- **Why it wins:** deepens Convex usage (relational graph, search, realtime viz) and Context.dev usage
  (entities come from its extraction), and adds a real innovation beat — cross-source memory — without
  breaking the three-partner / no-extra-spend constraint.

## Core user journey (the demo path — must be flawless)
1. Land on Prism. Paste any URL.
2. Pick a lens (default: **Watch** or **Audit** for a live, unrehearsed URL).
3. Prism kicks off a Context.dev crawl + extraction (a Convex action).
4. The board **fills in live** as results stream (Convex realtime) — no refresh.
5. Context.dev's structured extraction populates the lens insight, appended live; entities feed the graph.
6. For Watch/Compare: a scheduled Convex cron detects a change and it **pops into the feed in real time**.
7. Switch to **Ask**: the knowledge graph now holds everything crawled — query it and watch the graph light up.

## Functional requirements
- **F1** Add a source by URL; validate + normalize.
- **F2** Run a lens against a source (Convex action → Context.dev → store snapshot).
- **F3** Realtime board that updates as snapshots/findings/changes land (Convex subscriptions).
- **F4** Per-lens insight via Context.dev structured extraction (schema-driven), stored in Convex.
- **F5** Change detection: re-crawl, diff vs last snapshot, emit change events.
- **F6** Scheduled monitoring for Watch/Compare (Convex cron) — optional but great for demo.
- **F7** Shared realtime workspace (open two browsers, both update) — proves Convex.
- **F8** Landing page that sells the concept and routes into the app.

## Non-goals (v1 / hackathon)
- Auth/multi-tenant accounts (single shared workspace is fine for demo).
- Email/Slack alert delivery (in-app feed is enough; stub if time).
- Payment, org management, deep settings.

## Tech stack
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui. Deployed on Vercel.
- **Backend / realtime:** Convex (schema, queries, mutations, actions, crons).
- **Web context + AI:** Context.dev API — crawl, structured extraction (the reasoning layer), brand/company intelligence, change monitoring.
- **Built with:** Devin CLI (assigned substantial build chunks — see PLAN.md).
- **No separate LLM key / extra paid service.** Context.dev's extraction produces the lens insight.

## Success criteria (mapped to judging)
- **Product Value (25%)** — one obviously-useful agent, 5 real jobs it does.
- **Technical Execution (25%)** — realtime pipeline that visibly works live.
- **Partner Integration (25%)** — all three do load-bearing work; we can point to exactly where.
- **Innovation (15%)** — "one engine, five lenses" + any-URL live agent.
- **Demo & Clarity (10%)** — paste-a-URL-watch-it-happen, unrehearsable, robust.

## Risks & mitigations
- **Context.dev latency/limits** → cache snapshots in Convex; pre-warm one demo source; show streaming so waiting feels intentional.
- **Live crawl of an unknown URL fails on stage** → keep a known-good pinned source as fallback; Audit works on any static site.
- **Scope creep across 5 lenses** → build the engine + Watch + Audit rock-solid first; Research/Compare/Hunt reuse the same engine and ship as they land.
