# Prism — Hackathon Submission

**Project name:** Prism

**One-line description:** An AI web-intelligence agent — point it at any URL and it Watches, Audits, Researches, Compares, and Hunts, then folds everything it finds into one knowledge graph you can ask.

**Problem being solved:** The web is the biggest live dataset in the world, but it's unstructured, un-subscribable, and changes silently. People manually re-check competitor pages, re-read docs, re-audit their own sites, and copy-paste research. There's no single agent you can point at a URL and say "watch this, make sense of it, and remember it." Prism is that agent.

**Target users:** Founders, growth/marketing teams, analysts, VCs, and developers — anyone whose job involves watching or researching things on the web.

---

## How Devin was used
We used Devin as our AI software engineer to build part of the product in parallel while we owned the core realtime pipeline. Devin authored Prism's entire lens presentation layer — the five React/TypeScript components that render each lens's output in our dark design system (`src/components/lenses/`: `WatchPanel`, `AuditPanel`, `ResearchPanel`, `ComparePanel`, `HuntPanel`) — working from a written spec of our Convex data shapes (`docs/devin-lens-components.md`). We drove Devin non-interactively from the CLI (`devin --permission-mode accept-edits --prompt-file … -p`) with a scoped, file-isolated task so its output dropped straight into the codebase without conflicts; we then reviewed each component and wired them into the dashboard's lens router (`src/app/app/page.tsx`). Devin's components are strictly better than our inline placeholders — accessible, responsive, severity-sorted, and graceful with missing fields. This let one engineer own the high-risk core (Convex schema, the lens engine, change detection, the demo path) while Devin delivered the polished presentation breadth.

## How Convex was used
Convex is Prism's entire backend and the reason the UI updates live. Our schema (`convex/schema.ts`) models sources, snapshots, changes, analyses, findings, and a knowledge graph (entities + edges). Adding a source is a **mutation** that schedules an **action** (`runLens`) which calls Context.dev, then writes results through internal mutations; the app subscribes via **queries** (`views.board`, `graph.snapshot`, `views.recentChanges`) so every crawl, finding, and detected change streams into the board with no polling and no refresh — and across multiple viewers at once. A Convex **cron** (`convex/crons.ts` → `monitor.sweep`) autonomously re-crawls watched sources so changes surface on their own. The same live queries also power our Telegram bot's push alerts via Convex subscriptions.

## How Context.dev was used
Context.dev is Prism's crawl layer **and** its reasoning layer — we deliberately use it instead of a separate LLM. Every lens calls `POST /v1/web/extract` with a per-lens JSON Schema (`convex/lib/lensSchemas.ts`); Context.dev crawls the site and returns exactly the structured insight we asked for — `summary`/`keyPoints` for Watch, `findings[]` for Audit, a company memo for Research, comparable pricing tiers for Compare, and `opportunities[]` for Hunt. We use `GET /v1/web/scrape/markdown` to snapshot raw pages for change detection (hash-diffing snapshots over time), and `POST /v1/brand/retrieve` for brand intelligence (logo colors, industry, socials, team) in the Research lens. The entities Context.dev extracts from every lens feed our cross-source knowledge graph, which powers the "Ask" (Graph RAG) experience.

---

**Repository:** https://github.com/nabaruns/prism  (make it public before submitting)

**Live demo:** https://collabute-hackathon-phi.vercel.app  (landing → "Launch app" → sign in at `/app`)
- Deployed on **Vercel**, backed by a cloud **Convex** deployment (`prism-hackathon`).
- **Login:** email + password via Convex Auth (create an account on the sign-in screen).
- **Telegram:** message **@prism_web_bot** — a Convex HTTP-action webhook that DMs results + live change alerts back.
- **Slack:** the `/prism` slash command (research/audit/watch/hunt/compare/ask) → a Convex HTTP-action endpoint; results post back via the command's `response_url`.
- **Onboarding:** new accounts are auto-seeded with sample runs across the lenses.

**Video:** https://youtu.be/5XNut1SKtIw

**Disclosure of pre-existing assets:** None beyond standard open-source scaffolding — Next.js (create-next-app), Tailwind, and the Convex/Context.dev SDKs. All Prism-specific code (schema, lens engine, graph RAG, UI, Telegram bot) was written during the event.
