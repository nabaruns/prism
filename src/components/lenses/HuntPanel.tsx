"use client";

export type Finding = {
  _id: string;
  type: string;
  title: string;
  detail?: string;
  severity?: string;
  url?: string;
};

const fitBadge: Record<string, string> = {
  high: "bg-emerald-500/15 text-emerald-300",
  medium: "bg-amber-500/15 text-amber-300",
  low: "bg-white/10 text-white/60",
};

export function HuntPanel({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) {
    return <p className="text-sm text-white/50">—</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {findings.map((finding) => {
        const fit = (finding.severity ?? "unknown").toLowerCase();
        const badgeClass = fitBadge[fit] ?? "bg-white/10 text-white/60";

        const content = (
          <>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-medium text-white/90">
                {finding.title}
              </h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badgeClass}`}
              >
                {finding.severity ?? "—"}
              </span>
            </div>
            <p className="mt-1 text-xs uppercase tracking-wider text-white/40">
              {finding.type}
            </p>
            {typeof finding.detail === "string" && finding.detail.length > 0 && (
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                {finding.detail}
              </p>
            )}
          </>
        );

        return typeof finding.url === "string" && finding.url.length > 0 ? (
          <a
            key={finding._id}
            href={finding.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open opportunity: ${finding.title}`}
            className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
          >
            {content}
          </a>
        ) : (
          <article
            key={finding._id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            {content}
          </article>
        );
      })}
    </div>
  );
}
