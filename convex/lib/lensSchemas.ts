// Per-lens JSON Schemas handed to Context.dev's /web/extract.
// The schema IS the prompt: Context.dev fills these fields = Prism's reasoning.

export type Lens = "watch" | "audit" | "research" | "compare" | "hunt";

type LensDef = {
  schema: Record<string, unknown>;
  instructions: string;
  maxPages: number;
};

export const LENS_DEFS: Record<Lens, LensDef> = {
  // Watch: capture the essence of a page so we can summarize + diff it over time.
  watch: {
    maxPages: 1,
    instructions:
      "Summarize the current state of this page so changes can be tracked over time. Capture the key claims, numbers, prices, and calls to action verbatim where possible.",
    schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "1-2 sentence summary of the page right now" },
        keyPoints: { type: "array", items: { type: "string" }, description: "Salient facts/claims/prices, verbatim where possible" },
        entities: {
          type: "array",
          description: "Named things on the page (companies, products, prices, people)",
          items: {
            type: "object",
            properties: {
              type: { type: "string" },
              name: { type: "string" },
            },
            required: ["type", "name"],
          },
        },
      },
      required: ["summary", "keyPoints"],
    },
  },

  // Audit: does this site still tell the truth?
  audit: {
    maxPages: 8,
    instructions:
      "Audit this website for problems: stale or contradictory pricing, outdated dates or years, broken promises, dead or placeholder links, and claims that conflict across pages. Report concrete findings.",
    schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        findings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", description: "stale-pricing | outdated-date | contradiction | dead-link | vague-claim | other" },
              title: { type: "string" },
              detail: { type: "string" },
              severity: { type: "string", description: "low | medium | high" },
              url: { type: "string" },
            },
            required: ["type", "title", "detail", "severity"],
          },
        },
      },
      required: ["summary", "findings"],
    },
  },

  // Research: analyst-in-a-box memo for a company.
  research: {
    maxPages: 8,
    instructions:
      "Act as an analyst. Produce a concise, factual memo about this company based on its website: what it does, product, pricing, target customers, team/leadership, notable news, and risks or open questions.",
    schema: {
      type: "object",
      properties: {
        overview: { type: "string" },
        product: { type: "string" },
        pricing: { type: "string" },
        customers: { type: "string" },
        team: { type: "array", items: { type: "object", properties: { name: { type: "string" }, role: { type: "string" } }, required: ["name"] } },
        news: { type: "array", items: { type: "string" } },
        risks: { type: "array", items: { type: "string" } },
      },
      required: ["overview", "product"],
    },
  },

  // Compare: read a competitor's page for a diff-able, impact-focused snapshot.
  compare: {
    maxPages: 3,
    instructions:
      "Extract this competitor page in a structured, comparable way (positioning, pricing tiers, key features, differentiators) so it can be diffed against another competitor and monitored for changes.",
    schema: {
      type: "object",
      properties: {
        positioning: { type: "string" },
        pricingTiers: {
          type: "array",
          items: { type: "object", properties: { name: { type: "string" }, price: { type: "string" }, highlights: { type: "array", items: { type: "string" } } }, required: ["name"] },
        },
        keyFeatures: { type: "array", items: { type: "string" } },
        differentiators: { type: "array", items: { type: "string" } },
      },
      required: ["positioning", "pricingTiers"],
    },
  },

  // Hunt: pull opportunities from a listing page.
  hunt: {
    maxPages: 10,
    instructions:
      "Find opportunities on this listing site (jobs, grants, RFPs, programs, or similar). Extract each as a structured row with a link, and rate how attractive it looks.",
    schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        opportunities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              org: { type: "string" },
              url: { type: "string" },
              summary: { type: "string" },
              fit: { type: "string", description: "high | medium | low" },
              deadline: { type: "string" },
            },
            required: ["title", "url"],
          },
        },
      },
      required: ["opportunities"],
    },
  },
};
