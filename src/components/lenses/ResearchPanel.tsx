"use client";

export type Analysis = Record<string, any>;

type BrandColor = { hex?: string; name?: string };
type Industry = { industry?: string; subindustry?: string };

type Brand = {
  title?: string;
  slogan?: string;
  colors?: BrandColor[];
  industries?: { eic?: Industry[] };
};

const memoSections: { key: string; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "product", label: "Product" },
  { key: "pricing", label: "Pricing" },
  { key: "customers", label: "Customers" },
];

export function ResearchPanel({ analysis }: { analysis: Analysis }) {
  const brand: Brand | undefined = analysis?.brand;
  const team = analysis?.team;
  const risks = analysis?.risks;

  return (
    <div className="space-y-4">
      {brand && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-col gap-1">
            {typeof brand.title === "string" && brand.title.length > 0 && (
              <h2 className="text-lg font-semibold text-white/95">
                {brand.title}
              </h2>
            )}
            {typeof brand.slogan === "string" && brand.slogan.length > 0 && (
              <p className="text-sm italic text-white/50">{brand.slogan}</p>
            )}
          </div>

          {Array.isArray(brand.colors) && brand.colors.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {brand.colors.map((color, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-2 py-1"
                >
                  <span
                    className="h-5 w-5 rounded-full border border-white/10"
                    style={{
                      backgroundColor:
                        typeof color?.hex === "string" ? color.hex : undefined,
                    }}
                    aria-label={
                      typeof color?.name === "string"
                        ? `Color swatch ${color.name}`
                        : "Color swatch"
                    }
                  />
                  <span className="text-xs text-white/70">
                    {color?.name ?? "—"} {color?.hex ? `(${color.hex})` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}

          {Array.isArray(brand.industries?.eic) &&
            brand.industries.eic.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {brand.industries.eic.map((item, index) => (
                  <span
                    key={index}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs text-white/70"
                  >
                    {item?.industry ?? "—"}
                    {item?.subindustry ? ` · ${item.subindustry}` : ""}
                  </span>
                ))}
              </div>
            )}
        </div>
      )}

      {memoSections.map(({ key, label }) => {
        const value = analysis?.[key];
        if (typeof value !== "string" || value.length === 0) return null;
        return (
          <section
            key={key}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
              {label}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              {value}
            </p>
          </section>
        );
      })}

      {Array.isArray(team) && team.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
            Team
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {team.map((member, index) => (
              <span
                key={index}
                className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-sm text-white/80"
              >
                {typeof member?.name === "string" ? member.name : "—"}
                {typeof member?.role === "string" && member.role.length > 0
                  ? ` · ${member.role}`
                  : ""}
              </span>
            ))}
          </div>
        </section>
      )}

      {Array.isArray(risks) && risks.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
            Risks
          </h3>
          <ul className="mt-3 space-y-2">
            {risks.map((risk, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-white/70"
              >
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-400" />
                <span>
                  {typeof risk === "string" ? risk : String(risk ?? "—")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!brand &&
        !memoSections.some(
          ({ key }) => typeof analysis?.[key] === "string" && analysis[key].length > 0
        ) &&
        !(Array.isArray(team) && team.length > 0) &&
        !(Array.isArray(risks) && risks.length > 0) && (
          <p className="text-sm text-white/50">—</p>
        )}
    </div>
  );
}
