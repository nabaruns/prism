"use client";

export type Analysis = Record<string, any>;

export type Finding = {
  _id: string;
  type: string;
  title: string;
  detail?: string;
  severity?: string;
  url?: string;
};

const severityOrder = ["high", "medium", "low"];

const severityBadge: Record<string, string> = {
  high: "bg-rose-500/15 text-rose-300",
  medium: "bg-amber-500/15 text-amber-300",
  low: "bg-sky-500/15 text-sky-300",
};

export function AuditPanel({
  analysis,
  findings,
}: {
  analysis: Analysis;
  findings: Finding[];
}) {
  const summary = analysis?.summary;

  const grouped = new Map<string, Finding[]>();
  for (const finding of findings) {
    const severity = (finding.severity ?? "unknown").toLowerCase();
    const list = grouped.get(severity) ?? [];
    list.push(finding);
    grouped.set(severity, list);
  }

  const orderedSeverities = [
    ...severityOrder.filter((s) => grouped.has(s)),
    ...[...grouped.keys()].filter((s) => !severityOrder.includes(s)),
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        {typeof summary === "string" && summary.length > 0 ? (
          <p className="text-base leading-relaxed text-white/90">{summary}</p>
        ) : (
          <p className="text-white/50">—</p>
        )}
      </div>

      {findings.length === 0 && (
        <p className="text-sm text-white/50">No findings yet.</p>
      )}

      {orderedSeverities.map((severity) => (
        <section
          key={severity}
          aria-label={`${severity} severity findings`}
          className="space-y-3"
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">
            {severity} ({grouped.get(severity)?.length})
          </h3>
          <div className="space-y-3">
            {grouped.get(severity)?.map((finding) => (
              <article
                key={finding._id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h4 className="text-sm font-medium text-white/90">
                    {finding.title}
                  </h4>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      severityBadge[severity] ??
                      "bg-white/10 text-white/60"
                    }`}
                  >
                    {finding.severity ?? "unknown"}
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
                {typeof finding.url === "string" && finding.url.length > 0 && (
                  <a
                    href={finding.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-sm text-sky-300 hover:text-sky-200 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
                    aria-label={`Open details for ${finding.title}`}
                  >
                    View source
                    <span aria-hidden="true">↗</span>
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
