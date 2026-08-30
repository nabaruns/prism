"use client";

export type Analysis = Record<string, any>;

type PricingTier = {
  name?: string;
  price?: string;
  highlights?: string[];
};

export function ComparePanel({ analysis }: { analysis: Analysis }) {
  const positioning = analysis?.positioning;
  const pricingTiers: PricingTier[] = analysis?.pricingTiers ?? [];
  const keyFeatures: string[] = analysis?.keyFeatures ?? [];
  const differentiators: string[] = analysis?.differentiators ?? [];

  const hasContent =
    (typeof positioning === "string" && positioning.length > 0) ||
    pricingTiers.length > 0 ||
    keyFeatures.length > 0 ||
    differentiators.length > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
          Positioning
        </h3>
        {typeof positioning === "string" && positioning.length > 0 ? (
          <p className="mt-2 text-base leading-relaxed text-white/90">
            {positioning}
          </p>
        ) : (
          <p className="mt-2 text-white/50">—</p>
        )}
      </div>

      {pricingTiers.length > 0 && (
        <section
          aria-label="Pricing tiers"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {pricingTiers.map((tier, index) => (
            <article
              key={index}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <h4 className="text-sm font-medium text-white/90">
                {tier?.name ?? "—"}
              </h4>
              {typeof tier?.price === "string" && tier.price.length > 0 && (
                <p className="mt-1 text-lg font-semibold text-white/95">
                  {tier.price}
                </p>
              )}
              {Array.isArray(tier?.highlights) && tier.highlights.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {tier.highlights.map((highlight, hIndex) => (
                    <li
                      key={hIndex}
                      className="flex items-start gap-2 text-sm text-white/60"
                    >
                      <span
                        className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-400"
                        aria-hidden="true"
                      />
                      <span>
                        {typeof highlight === "string"
                          ? highlight
                          : String(highlight)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </section>
      )}

      {keyFeatures.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
            Key features
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {keyFeatures.map((feature, index) => (
              <span
                key={index}
                className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-sm text-white/80"
              >
                {typeof feature === "string" ? feature : String(feature)}
              </span>
            ))}
          </div>
        </section>
      )}

      {differentiators.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
            Differentiators
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {differentiators.map((item, index) => (
              <span
                key={index}
                className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-sm text-sky-200"
              >
                {typeof item === "string" ? item : String(item)}
              </span>
            ))}
          </div>
        </section>
      )}

      {!hasContent && <p className="text-sm text-white/50">—</p>}
    </div>
  );
}
