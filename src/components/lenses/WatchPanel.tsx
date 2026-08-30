"use client";

export type Analysis = Record<string, any>;

export function WatchPanel({ analysis }: { analysis: Analysis }) {
  const summary = analysis?.summary;
  const keyPoints = analysis?.keyPoints;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      {typeof summary === "string" && summary.length > 0 ? (
        <p className="text-base leading-relaxed text-white/90">{summary}</p>
      ) : (
        <p className="text-white/50">—</p>
      )}

      {Array.isArray(keyPoints) && keyPoints.length > 0 && (
        <ul className="mt-4 space-y-2">
          {keyPoints.map((point, index) => (
            <li
              key={index}
              className="flex items-start gap-2 text-sm text-white/70"
            >
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-400" />
              <span>{typeof point === "string" ? point : String(point)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
