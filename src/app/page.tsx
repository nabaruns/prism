import Link from "next/link";

const LENSES = [
  {
    name: "Watch",
    tag: "Change monitoring",
    desc: "Turn any page into a live feed. Prism detects changes and tells you what changed and why it matters.",
    accent: "from-rose-400 to-orange-400",
    glyph: "◉",
  },
  {
    name: "Audit",
    tag: "Truth check",
    desc: "Does your site still tell the truth? Find stale pricing, dead links, contradictions, and outdated claims.",
    accent: "from-amber-400 to-yellow-300",
    glyph: "❖",
  },
  {
    name: "Research",
    tag: "Analyst-in-a-box",
    desc: "Point at any company domain. Get a structured memo: product, pricing, team, news, and risks.",
    accent: "from-emerald-400 to-teal-300",
    glyph: "✦",
  },
  {
    name: "Compare",
    tag: "Competitor radar",
    desc: "Track a rival's pricing, docs, and site. See side-by-side diffs plus an AI read on the impact.",
    accent: "from-sky-400 to-cyan-300",
    glyph: "⧉",
  },
  {
    name: "Hunt",
    tag: "Opportunity finder",
    desc: "Crawl listing sites for grants, RFPs, or jobs. Get a ranked, matched board that fills in live.",
    accent: "from-violet-400 to-fuchsia-400",
    glyph: "✺",
  },
];

const PARTNERS = [
  { name: "Context.dev", role: "Crawls, extracts intelligence, and monitors the web" },
  { name: "Convex", role: "Streams every result to the UI in realtime" },
  { name: "Devin", role: "The AI engineer that built Prism" },
];

export default function Home() {
  return (
    <main className="relative flex-1 overflow-hidden">
      {/* background */}
      <div className="pointer-events-none absolute inset-0 prism-grid" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[conic-gradient(from_180deg,rgba(244,114,182,0.18),rgba(251,191,36,0.16),rgba(52,211,153,0.16),rgba(56,189,248,0.18),rgba(167,139,250,0.2),rgba(244,114,182,0.18))] blur-3xl" />

      {/* nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <PrismMark />
          <span className="text-lg font-semibold tracking-tight">Prism</span>
        </div>
        <nav className="flex items-center gap-6 text-sm text-white/60">
          <a href="#lenses" className="hidden hover:text-white sm:inline">Lenses</a>
          <a href="#how" className="hidden hover:text-white sm:inline">How it works</a>
          <Link
            href="/app"
            className="rounded-full bg-white px-4 py-2 font-medium text-black transition hover:bg-white/90"
          >
            Launch app
          </Link>
        </nav>
      </header>

      {/* hero */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pt-16 pb-20 text-center sm:pt-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ animation: "prism-pulse 2s ease-in-out infinite" }} />
          Collabute × TheBlock · AI web-intelligence agent
        </span>
        <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
          One URL.
          <br />
          <span className="bg-gradient-to-r from-rose-300 via-amber-200 via-emerald-200 via-sky-200 to-violet-300 bg-clip-text text-transparent">
            Five lenses on the web.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/60">
          Prism is an AI agent you point at any webpage. It <b className="text-white/90">watches</b>,{" "}
          <b className="text-white/90">audits</b>, <b className="text-white/90">researches</b>,{" "}
          <b className="text-white/90">compares</b>, and <b className="text-white/90">hunts</b> — one engine
          that crawls the web, streams results in realtime, and tells you what actually matters.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/app"
            className="rounded-full bg-white px-6 py-3 font-medium text-black transition hover:bg-white/90"
          >
            Paste a URL →
          </Link>
          <a
            href="#how"
            className="rounded-full border border-white/15 px-6 py-3 font-medium text-white/80 transition hover:bg-white/5"
          >
            See how it works
          </a>
        </div>
      </section>

      {/* lenses */}
      <section id="lenses" className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {LENSES.map((l) => (
            <div
              key={l.name}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.05]"
            >
              <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${l.accent} text-lg text-black`}>
                {l.glyph}
              </div>
              <h3 className="text-lg font-semibold">{l.name}</h3>
              <p className="text-xs uppercase tracking-wide text-white/40">{l.tag}</p>
              <p className="mt-3 text-sm leading-relaxed text-white/60">{l.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* graph rag */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-8 sm:p-12">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(167,139,250,0.18),transparent_70%)] blur-2xl" />
          <div className="relative grid grid-cols-1 items-center gap-8 md:grid-cols-[1.2fr_1fr]">
            <div>
              <span className="text-xs uppercase tracking-widest text-violet-300/80">
                Connected memory · Graph RAG
              </span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Every crawl becomes one graph you can ask
              </h2>
              <p className="mt-4 text-white/60">
                Whatever lens you run, Prism folds the entities it finds — companies, products,
                prices, people, changes — into a single knowledge graph in Convex. Ask across
                everything you&apos;ve ever pointed it at: <span className="text-white/85">&ldquo;every price
                change across my competitors,&rdquo;</span> answered by traversing the graph. No extra model,
                no extra spend.
              </p>
            </div>
            <div className="flex items-center justify-center">
              <div className="grid grid-cols-3 gap-3 text-center text-[11px] text-white/70">
                {["Company", "Product", "Price", "Person", "Change", "Doc", "News", "Site", "Deal"].map(
                  (n, i) => (
                    <div
                      key={n}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-3"
                      style={{ animation: `prism-pulse ${2 + (i % 3) * 0.6}s ease-in-out infinite` }}
                    >
                      {n}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
          One engine behind every lens
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-white/55">
          Prism refracts a single pipeline into five products. Change the prompt, change the output —
          the plumbing stays the same.
        </p>
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Step n="1" title="Crawl" sub="Context.dev">
            Point Prism at any URL. Context.dev crawls the page or the whole site and captures a
            snapshot it can watch for changes over time.
          </Step>
          <Step n="2" title="Understand" sub="Context.dev">
            Its AI extraction and brand intelligence turn raw pages into structured insight — what
            changed, what&apos;s stale, the findings and opportunities — no separate model required.
          </Step>
          <Step n="3" title="Stream" sub="Convex">
            Every snapshot, diff, and finding lands in Convex and streams straight to the board —
            live, no refresh, shared across viewers.
          </Step>
        </div>
      </section>

      {/* partners */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8">
          <p className="text-center text-xs uppercase tracking-widest text-white/40">
            Built on
          </p>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {PARTNERS.map((p) => (
              <div key={p.name} className="text-center sm:text-left">
                <p className="text-base font-semibold">{p.name}</p>
                <p className="mt-1 text-sm text-white/50">{p.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 py-8 text-center text-sm text-white/35">
        Prism · Collabute × TheBlock Hackathon, Dubai · 30 Aug 2026
      </footer>
    </main>
  );
}

function Step({
  n,
  title,
  sub,
  children,
}: {
  n: string;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-sm text-white/60">
          {n}
        </span>
        <div>
          <h3 className="font-semibold leading-none">{title}</h3>
          <span className="text-xs text-white/40">{sub}</span>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-white/60">{children}</p>
    </div>
  );
}

function PrismMark() {
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-400 via-amber-300 to-violet-400"
      style={{ animation: "prism-float 6s ease-in-out infinite" }}
    >
      <span className="text-sm font-bold text-black">P</span>
    </div>
  );
}
