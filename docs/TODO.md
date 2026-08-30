# Prism — TODO

Legend: [ ] todo · [~] in progress · [x] done · (D) Devin

## 0. Setup
- [x] Scaffold Next.js 16 + TS + Tailwind + landing
- [x] Convex local deployment running; NEXT_PUBLIC_CONVEX_URL wired
- [x] Context.dev key set in Convex env; verified live (3400+ credits)
- [x] Telegram bot token set

## 1. Core engine — DONE & verified
- [x] Convex schema (sources, snapshots, changes, analyses, findings, entities, edges)
- [x] `convex/lib/context.ts` (extract / scrape / brand)
- [x] Per-lens extraction schemas
- [x] `runLens` action (crawl + extract → snapshot + analysis/findings)
- [x] Change detection (fresh crawl + hash diff) — verified firing on dynamic pages
- [x] `crons.ts` autonomous monitoring

## 2. Lenses — all 5 verified end-to-end
- [x] Watch · Audit · Research · Compare · Hunt
- [x] Ask (Graph RAG): entities/edges + search + `graph.ask`

## 3. UI
- [x] Realtime `/app` board (input, lens picker, live board, Ask tab)
- [x] GraphView force-directed viz (wired into Ask)
- [x] (D) Devin built polished lens components `src/components/lenses/*` — wired into LensBody, typecheck clean

## 4. Chat interface
- [x] Telegram bot (`scripts/telegram-bot.mjs`) — running as @prism_web_bot
- [ ] User to message-test the bot (watch/research/ask + change alerts)
- [ ] (stretch) Slack

## 5. Landing
- [x] Hero, five-lens grid, Graph RAG section, how-it-works, partners

## 6. Demo hardening
- [x] Seeded demo set across all 5 lenses; dynamic Watch for live-change moment
- [ ] Two-browser realtime check (Convex handles it; eyeball once)
- [ ] Rehearse 3-min script

## 7. Submission (by 17:00)
- [x] Draft write-up (`docs/SUBMISSION.md`) — problem, users, 3 partner paragraphs
- [ ] Repo link + demo/video links
- [x] Devin paragraph corrected to match what Devin actually built (the 5 lens components)
