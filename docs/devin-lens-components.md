DEVIN TASK — Prism lens presentation components

Run this from the repo root (workspace is already trusted):

    devin --permission-mode accept-edits --prompt-file docs/devin-lens-components.md -p

(If it stalls on a confirmation, use `--permission-mode dangerous` instead. It should NOT need to run any commands — only create files.)

────────────────────────────────────────────────────────────────────────
You are contributing to an existing Next.js 16 + React 19 + Tailwind v4 app called "Prism"
(an AI web-intelligence agent). Create FIVE new presentational components, one per file, under
`src/components/lenses/`. Do NOT modify any other file. Do NOT run shell commands, do NOT execute
or test anything, do NOT install packages. Only create these files:

  src/components/lenses/WatchPanel.tsx
  src/components/lenses/AuditPanel.tsx
  src/components/lenses/ResearchPanel.tsx
  src/components/lenses/ComparePanel.tsx
  src/components/lenses/HuntPanel.tsx

Each is a "use client" component that receives already-fetched Convex data as props and renders it
beautifully in the app's dark theme (Tailwind classes; cards use `rounded-2xl border border-white/10
bg-white/[0.03] p-4`; muted text is `text-white/50`; accents per severity/fit). No data fetching
inside — pure presentation. Match this shared data shape:

  type Analysis = Record<string, any>;   // analyses[0].content
  type Finding = { _id: string; type: string; title: string; detail?: string; severity?: string; url?: string };

Props per component:
  WatchPanel({ analysis }: { analysis: Analysis })
     - render analysis.summary (prominent) + analysis.keyPoints (string[]) as a tidy list.
  AuditPanel({ analysis, findings }: { analysis: Analysis; findings: Finding[] })
     - analysis.summary, then findings grouped/sorted by severity (high→low) with colored severity
       badges (high=rose, medium=amber, low=sky), type label, detail, and an external link if url.
  ResearchPanel({ analysis }: { analysis: Analysis })
     - analysis.brand (optional: { title, slogan, colors:[{hex,name}], industries:{eic:[{industry,subindustry}]} })
       shown as a header with color swatches; then memo sections overview/product/pricing/customers,
       team (array of {name,role}) as chips, risks (string[]) as a list. Skip empty sections.
  ComparePanel({ analysis }: { analysis: Analysis })
     - analysis.positioning; pricingTiers (array of {name,price,highlights:string[]}) as cards;
       keyFeatures and differentiators as tag lists.
  HuntPanel({ findings }: { findings: Finding[] })
     - responsive grid of opportunity cards: title, a fit badge from `severity` (high=emerald,
       medium=amber, low=gray), detail, whole card links to url.

Requirements: strict TypeScript (no implicit any in public props), accessible, responsive, graceful
when fields are missing (render nothing or a subtle "—"), consistent spacing, no external libraries.
Export each as a named export matching the filename. When done, list the five file paths.
