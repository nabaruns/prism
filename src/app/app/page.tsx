"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { SignIn } from "../../components/SignIn";
import { api } from "../../../convex/_generated/api";
import type { Id, Doc } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import { GraphView } from "../../components/GraphView";
import { WatchPanel } from "../../components/lenses/WatchPanel";
import { AuditPanel } from "../../components/lenses/AuditPanel";
import { ResearchPanel } from "../../components/lenses/ResearchPanel";
import { ComparePanel } from "../../components/lenses/ComparePanel";
import { HuntPanel } from "../../components/lenses/HuntPanel";

const LENSES = [
  { key: "watch", label: "Watch", glyph: "◉", hint: "Track changes on a page" },
  { key: "audit", label: "Audit", glyph: "❖", hint: "Find stale / broken / contradictory content" },
  { key: "research", label: "Research", glyph: "✦", hint: "Company memo from a domain" },
  { key: "compare", label: "Compare", glyph: "⧉", hint: "Diff a competitor page" },
  { key: "hunt", label: "Hunt", glyph: "✺", hint: "Pull opportunities from a listing" },
] as const;

type LensKey = (typeof LENSES)[number]["key"];

export default function AppPage() {
  return (
    <>
      <AuthLoading>
        <div className="grid min-h-[70vh] place-items-center text-white/40">Loading…</div>
      </AuthLoading>
      <Unauthenticated>
        <SignIn />
      </Unauthenticated>
      <Authenticated>
        <Workspace />
      </Authenticated>
    </>
  );
}

function Workspace() {
  const { signOut } = useAuthActions();
  const [url, setUrl] = useState("");
  const [lens, setLens] = useState<LensKey>("watch");
  const [selected, setSelected] = useState<Id<"sources"> | null>(null);
  const [tab, setTab] = useState<"board" | "ask">("board");

  // Deep-link: restore tab/source from the URL on mount.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("tab") === "ask") setTab("ask");
    const s = p.get("source");
    if (s) setSelected(s as Id<"sources">);
  }, []);

  // Reflect current view in the URL so it changes and can be shared/bookmarked.
  useEffect(() => {
    const p = new URLSearchParams();
    p.set("tab", tab);
    if (selected) p.set("source", selected);
    window.history.replaceState(null, "", `/app?${p.toString()}`);
  }, [tab, selected]);

  const sourcesRaw = useQuery(api.sources.list);
  const sources = sourcesRaw ?? [];
  const ensureSamples = useMutation(api.seed.ensureSamples);
  const [seedTried, setSeedTried] = useState(false);

  // First-run onboarding: if the dashboard is empty, seed sample runs (idempotent server-side).
  useEffect(() => {
    if (!seedTried && sourcesRaw !== undefined && sourcesRaw.length === 0) {
      setSeedTried(true);
      void ensureSamples();
    }
  }, [sourcesRaw, seedTried, ensureSamples]);

  const telegramConnected = useQuery(api.telegram.isConnected) ?? false;
  const slackConnected = useQuery(api.slack.isConnected) ?? false;
  const add = useMutation(api.sources.add);
  const createLinkCode = useMutation(api.telegram.createLinkCode);
  const [slackCode, setSlackCode] = useState<string | null>(null);

  function genCode() {
    const raw = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    return raw.replace(/-/g, "").slice(0, 12);
  }
  async function connectTelegram() {
    const code = genCode();
    await createLinkCode({ code });
    window.open(`https://t.me/prism_web_bot?start=${code}`, "_blank");
  }
  async function connectSlack() {
    const code = genCode();
    await createLinkCode({ code });
    setSlackCode(code);
  }

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrText, setOcrText] = useState<string | null>(null);

  async function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrBusy(true);
    setOcrText(null);
    try {
      // 1) store the image in Convex file storage
      const uploadUrl = await generateUploadUrl();
      await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      // 2) OCR it in the browser (free, no server)
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const text = data.text.trim();
      setOcrText(text || "(no text found)");
      const m = text.match(/https?:\/\/[^\s]+/i) || text.match(/[\w-]+\.(?:com|dev|ai|io|org|net|co|app)(?:\/[^\s]*)?/i);
      if (m) setUrl(m[0].replace(/[.,)]+$/, ""));
    } catch {
      setOcrText("Couldn't read that image — try a clearer one.");
    } finally {
      setOcrBusy(false);
      e.target.value = "";
    }
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    const id = await add({ url, lens });
    setUrl("");
    setSelected(id);
    setTab("board");
  }

  return (
    <main className="flex-1">
      {/* top bar */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#06060b]/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-400 via-amber-300 to-violet-400 text-sm font-bold text-black">P</span>
            <span className="font-semibold">Prism</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 rounded-full border border-white/10 p-1 text-sm">
              <button onClick={() => setTab("board")} className={`rounded-full px-4 py-1 ${tab === "board" ? "bg-white text-black" : "text-white/60"}`}>Board</button>
              <button onClick={() => setTab("ask")} className={`rounded-full px-4 py-1 ${tab === "ask" ? "bg-white text-black" : "text-white/60"}`}>Ask</button>
            </div>
            {telegramConnected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-sm text-emerald-200" title="Your Telegram is linked to @prism_web_bot">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Telegram
              </span>
            ) : (
              <button onClick={() => void connectTelegram()} className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1.5 text-sm text-sky-200 hover:bg-sky-400/20" title="Link this account to @prism_web_bot">Connect Telegram</button>
            )}
            {slackConnected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-sm text-emerald-200" title="Your Slack is linked">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Slack
              </span>
            ) : (
              <button onClick={() => void connectSlack()} className="rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1.5 text-sm text-violet-200 hover:bg-violet-400/20" title="Link your Slack via /prism connect">Connect Slack</button>
            )}
            <button onClick={() => void signOut()} className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/60 hover:bg-white/5">Sign out</button>
          </div>
        </div>
      </header>

      {slackCode && (
        <div className="border-b border-violet-400/20 bg-violet-400/[0.06] px-5 py-2.5 text-sm text-violet-100">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <span>In Slack, run <code className="rounded bg-black/30 px-1.5 py-0.5">/prism connect {slackCode}</code> to link this account.</span>
            <button onClick={() => setSlackCode(null)} className="shrink-0 text-violet-300 hover:text-white">Dismiss</button>
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-5 py-6 lg:grid-cols-[340px_1fr]">
        {/* left: input + sources (sticky on desktop) */}
        <aside className="space-y-4 lg:sticky lg:top-[68px] lg:self-start lg:max-h-[calc(100vh-88px)] lg:overflow-y-auto lg:pr-1">
          <form onSubmit={onAdd} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste any URL…"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-white/30"
            />
            <div className="grid grid-cols-5 gap-1">
              {LENSES.map((l) => (
                <button
                  type="button"
                  key={l.key}
                  onClick={() => setLens(l.key)}
                  title={l.hint}
                  className={`flex flex-col items-center rounded-lg border py-2 text-[10px] ${lens === l.key ? "border-white/40 bg-white/10" : "border-white/10 text-white/50"}`}
                >
                  <span className="text-base">{l.glyph}</span>
                  {l.label}
                </button>
              ))}
            </div>
            <button className="w-full rounded-lg bg-white py-2 text-sm font-medium text-black transition hover:bg-white/90">
              Run {LENSES.find((l) => l.key === lens)!.label} →
            </button>
            <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 py-2 text-xs ${ocrBusy ? "text-white/40" : "text-white/50 hover:border-white/30"}`}>
              {ocrBusy ? "Reading image…" : "📷 OCR an image → URL"}
              <input type="file" accept="image/*" className="hidden" onChange={onImage} disabled={ocrBusy} />
            </label>
            {ocrText && (
              <p className="max-h-20 overflow-y-auto rounded bg-black/30 p-2 text-[11px] leading-relaxed text-white/50">
                <span className="text-white/40">Stored in Convex · OCR:</span> {ocrText.slice(0, 240)}
              </p>
            )}
          </form>

          <div className="space-y-1.5">
            {sources.map((s: Doc<"sources">) => (
              <button
                key={s._id}
                onClick={() => { setSelected(s._id); setTab("board"); }}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${selected === s._id ? "border-white/30 bg-white/[0.06]" : "border-white/5 hover:bg-white/[0.03]"}`}
              >
                <span className="text-xs">{LENSES.find((l) => l.key === s.lens)?.glyph}</span>
                <span className="flex-1 truncate">{s.domain}</span>
                <StatusDot status={s.status} />
              </button>
            ))}
            {sources.length === 0 && <p className="px-2 text-xs text-white/30">No sources yet. Paste a URL above.</p>}
          </div>
        </aside>

        {/* right: board or ask */}
        <section>
          {tab === "ask" ? <AskPanel /> : selected ? <Board sourceId={selected} /> : <Empty />}
        </section>
      </div>
    </main>
  );
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = { ready: "bg-emerald-400", crawling: "bg-amber-400 animate-pulse", pending: "bg-white/30", error: "bg-rose-500" };
  return <span className={`h-2 w-2 rounded-full ${map[status] ?? "bg-white/30"}`} title={status} />;
}

function Empty() {
  return (
    <div className="grid h-80 place-items-center rounded-2xl border border-dashed border-white/10 text-center text-white/40">
      <div>
        <p className="text-lg">Paste a URL and pick a lens.</p>
        <p className="mt-1 text-sm">The board fills in live as Context.dev crawls and Convex streams it back.</p>
      </div>
    </div>
  );
}

function Board({ sourceId }: { sourceId: Id<"sources"> }) {
  const data = useQuery(api.views.board, { sourceId });
  const rerun = useMutation(api.sources.rerun);
  if (data === undefined) return <Skeleton />;
  if (data === null) return <Empty />;
  const { source, analyses, findings, changes } = data;
  const analysis = analyses[0]?.content ?? {};

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-white/50">
            <span>{LENSES.find((l) => l.key === source.lens)?.glyph} {LENSES.find((l) => l.key === source.lens)?.label}</span>
            <StatusDot status={source.status} />
            <span>{source.status}</span>
          </div>
          <a href={source.url} target="_blank" className="mt-1 block truncate text-lg font-semibold hover:underline">{source.domain}</a>
          {source.error && <p className="mt-1 text-sm text-rose-400">{source.error}</p>}
        </div>
        <button onClick={() => rerun({ sourceId })} className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5">Re-run</button>
      </div>

      {source.status === "crawling" && <Skeleton label="Crawling & extracting with Context.dev…" />}

      {/* change feed (watch/compare) */}
      {changes.length > 0 && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-4">
          <h3 className="mb-2 text-sm font-semibold text-amber-200">Changes detected</h3>
          <ul className="space-y-2">
            {changes.map((c: Doc<"changes">) => (
              <li key={c._id} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
                <div className="flex items-center gap-2"><SevBadge sev={c.severity} /><span className="text-white/40">{new Date(c.createdAt).toLocaleTimeString()}</span></div>
                <p className="mt-1">{c.summary}</p>
                {c.whyItMatters && <p className="mt-1 text-xs text-white/50">Why it matters: {c.whyItMatters}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* lens-specific body */}
      <LensBody lens={source.lens} analysis={analysis} findings={findings} />
    </div>
  );
}

// Routes each lens to its presentation component (authored by Devin).
function LensBody({ lens, analysis, findings }: { lens: string; analysis: any; findings: any[] }) {
  switch (lens) {
    case "audit":
      return <AuditPanel analysis={analysis} findings={findings} />;
    case "hunt":
      return <HuntPanel findings={findings} />;
    case "research":
      return <ResearchPanel analysis={analysis} />;
    case "compare":
      return <ComparePanel analysis={analysis} />;
    default:
      return <WatchPanel analysis={analysis} />;
  }
}

function AskPanel() {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const res = useQuery(api.graph.ask, submitted ? { q: submitted } : "skip");
  const graph = useQuery(api.graph.snapshot) ?? { entities: [], edges: [] };

  return (
    <div className="space-y-4">
      <Card title="Ask the graph">
        <p className="mb-3 text-sm text-white/50">Everything Prism has crawled — across every lens — is one knowledge graph. Ask across all of it.</p>
        <form onSubmit={(e) => { e.preventDefault(); setSubmitted(q); }} className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. pricing, Vercel, opportunities…" className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30" />
          <button className="rounded-lg bg-white px-4 text-sm font-medium text-black">Ask</button>
        </form>
        {res && <p className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/80">{res.answer}</p>}
      </Card>
      <Card title={`Knowledge graph · ${graph.entities.length} entities · ${graph.edges.length} links`}>
        <GraphView
          entities={graph.entities.map((e: any) => ({ key: e.key, type: e.type, name: e.name, sourceIds: e.sourceIds }))}
          edges={graph.edges.map((e: any) => ({ fromKey: e.fromKey, toKey: e.toKey, rel: e.rel }))}
        />
      </Card>
    </div>
  );
}

// ── small ui bits ────────────────────────────────────────────────────────────
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="mb-3 text-sm font-semibold text-white/80">{title}</h3>
      {children}
    </div>
  );
}
function SevBadge({ sev }: { sev?: string }) {
  const map: Record<string, string> = { high: "bg-rose-500/20 text-rose-300", medium: "bg-amber-500/20 text-amber-200", low: "bg-sky-500/20 text-sky-200", info: "bg-white/10 text-white/60" };
  return <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${map[sev ?? "info"] ?? map.info}`}>{sev ?? "info"}</span>;
}
function Skeleton({ label }: { label?: string }) {
  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      {label && <p className="text-sm text-white/50">{label}</p>}
      <div className="h-3 w-3/4 animate-pulse rounded bg-white/10" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
    </div>
  );
}
