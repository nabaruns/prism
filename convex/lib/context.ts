// Thin client for the Context.dev web-intelligence API.
// This is Prism's crawl + reasoning layer. Called from Convex actions.
// Docs: https://docs.context.dev

const BASE = "https://api.context.dev/v1";

function apiKey(): string {
  const k = process.env.CONTEXT_API_KEY;
  if (!k) throw new Error("CONTEXT_API_KEY is not set in the Convex deployment env");
  return k;
}

type ScrapeResult = {
  success: boolean;
  markdown: string;
  metadata?: { title?: string; description?: string; siteName?: string };
  key_metadata?: { credits_consumed: number; credits_remaining: number };
};

// Clean markdown for a single page. Cheap (1 credit). Used for snapshots + change diffing.
// `maxAgeMs` controls cache freshness; pass 0 to force a fresh crawl (needed for change detection).
export async function scrapeMarkdown(url: string, maxAgeMs = 0): Promise<ScrapeResult> {
  const qs = new URLSearchParams({ url, useMainContentOnly: "true", includeLinks: "true", maxAgeMs: String(maxAgeMs) });
  const res = await fetch(`${BASE}/web/scrape/markdown?${qs}`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
  });
  if (!res.ok) throw new Error(`scrapeMarkdown ${res.status}: ${await res.text()}`);
  return res.json();
}

type ExtractOpts = {
  instructions?: string;
  maxPages?: number;
  maxDepth?: number;
};

type ExtractResult<T = unknown> = {
  status: string;
  url: string;
  urls_analyzed?: string[];
  data: T;
  key_metadata?: { credits_consumed: number; credits_remaining: number };
};

// Schema-driven structured extraction — THE reasoning layer.
// Hand it a JSON Schema of the insight you want; Context.dev fills it. (~10 credits)
export async function extract<T = unknown>(
  url: string,
  schema: Record<string, unknown>,
  opts: ExtractOpts = {},
): Promise<ExtractResult<T>> {
  const res = await fetch(`${BASE}/web/extract`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      schema,
      maxPages: opts.maxPages ?? 5,
      ...(opts.maxDepth !== undefined ? { maxDepth: opts.maxDepth } : {}),
      ...(opts.instructions ? { instructions: opts.instructions } : {}),
    }),
  });
  if (!res.ok) throw new Error(`extract ${res.status}: ${await res.text()}`);
  return res.json();
}

type BrandResult = {
  status: string;
  brand?: Record<string, unknown>;
  key_metadata?: { credits_consumed: number; credits_remaining: number };
};

// Company/brand intelligence for the Research lens. (~10 credits)
export async function retrieveBrand(domain: string): Promise<BrandResult> {
  const res = await fetch(`${BASE}/brand/retrieve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "by_domain", domain }),
  });
  if (!res.ok) throw new Error(`retrieveBrand ${res.status}: ${await res.text()}`);
  return res.json();
}
