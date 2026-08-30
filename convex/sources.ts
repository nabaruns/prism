import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { LENS } from "./schema";
import { LENS_DEFS, Lens } from "./lib/lensSchemas";
import { scrapeMarkdown, extract, retrieveBrand } from "./lib/context";

// ── Queries (scoped to the signed-in user) ───────────────────────────────────
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("sources").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").take(50);
  },
});

export const get = query({
  args: { id: v.id("sources") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    const s = await ctx.db.get(id);
    if (!s || s.userId !== userId) return null;
    return s;
  },
});

// ── Add a source and kick off the lens run ───────────────────────────────────
function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
function normalizeUrl(url: string): string {
  const u = url.trim();
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

export async function insertSource(
  ctx: any,
  userId: Id<"users">,
  url: string,
  lens: string,
  telegramChatId?: number,
  slackResponseUrl?: string,
): Promise<Id<"sources">> {
  const norm = normalizeUrl(url);
  const id = await ctx.db.insert("sources", {
    userId,
    url: norm,
    domain: domainOf(norm),
    lens,
    status: "pending",
    ...(telegramChatId !== undefined ? { telegramChatId } : {}),
    ...(slackResponseUrl !== undefined ? { slackResponseUrl } : {}),
    createdAt: Date.now(),
  });
  await ctx.scheduler.runAfter(0, internal.sources.runLens, { sourceId: id });
  return id;
}

// From the app (authenticated user).
export const add = mutation({
  args: { url: v.string(), lens: LENS },
  handler: async (ctx, { url, lens }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in to add a source.");
    return await insertSource(ctx, userId, url, lens);
  },
});

// From the Telegram webhook (user resolved from the linked chat).
export const addForUser = internalMutation({
  args: { userId: v.id("users"), url: v.string(), lens: LENS, telegramChatId: v.number() },
  handler: async (ctx, { userId, url, lens, telegramChatId }) => {
    return await insertSource(ctx, userId, url, lens, telegramChatId);
  },
});

// From the Slack slash command (reply goes to the slash command's response_url).
export const addForUserSlack = internalMutation({
  args: { userId: v.id("users"), url: v.string(), lens: LENS, responseUrl: v.string() },
  handler: async (ctx, { userId, url, lens, responseUrl }) => {
    return await insertSource(ctx, userId, url, lens, undefined, responseUrl);
  },
});

// Re-run a source (owned by the caller).
export const rerun = mutation({
  args: { sourceId: v.id("sources") },
  handler: async (ctx, { sourceId }) => {
    const userId = await getAuthUserId(ctx);
    const s = await ctx.db.get(sourceId);
    if (!s || s.userId !== userId) throw new Error("Not found.");
    await ctx.db.patch(sourceId, { status: "pending" });
    await ctx.scheduler.runAfter(0, internal.sources.runLens, { sourceId });
  },
});

// ── Internal write helpers (actions call these) ──────────────────────────────
export const setStatus = internalMutation({
  args: { sourceId: v.id("sources"), status: v.string(), error: v.optional(v.string()), title: v.optional(v.string()) },
  handler: async (ctx, { sourceId, status, error, title }) => {
    const patch: Record<string, unknown> = { status };
    if (error !== undefined) patch.error = error;
    if (title !== undefined) patch.title = title;
    await ctx.db.patch(sourceId, patch);
  },
});

export const saveSnapshot = internalMutation({
  args: { sourceId: v.id("sources"), contentHash: v.string(), markdown: v.optional(v.string()), extracted: v.optional(v.any()) },
  handler: async (ctx, args) => {
    return await ctx.db.insert("snapshots", { ...args, crawledAt: Date.now() });
  },
});

export const saveAnalysis = internalMutation({
  args: { sourceId: v.id("sources"), lens: LENS, content: v.any() },
  handler: async (ctx, args) => {
    await ctx.db.insert("analyses", { ...args, createdAt: Date.now() });
  },
});

export const saveFinding = internalMutation({
  args: {
    sourceId: v.id("sources"),
    lens: LENS,
    type: v.string(),
    title: v.string(),
    detail: v.optional(v.string()),
    severity: v.optional(v.string()),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("findings", { ...args, createdAt: Date.now() });
  },
});

export const saveChange = internalMutation({
  args: {
    sourceId: v.id("sources"),
    toSnapshotId: v.id("snapshots"),
    summary: v.string(),
    whyItMatters: v.optional(v.string()),
    severity: v.union(v.literal("info"), v.literal("low"), v.literal("medium"), v.literal("high")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("changes", { ...args, createdAt: Date.now() });
  },
});

export const lastSnapshotHash = internalMutation({
  args: { sourceId: v.id("sources"), exceptHash: v.string() },
  handler: async (ctx, { sourceId, exceptHash }) => {
    const snaps = await ctx.db
      .query("snapshots")
      .withIndex("by_source", (q) => q.eq("sourceId", sourceId))
      .order("desc")
      .take(5);
    // most recent snapshot that isn't the one we just wrote
    const prev = snaps.find((s) => s.contentHash !== exceptHash);
    return prev?.contentHash ?? null;
  },
});

// djb2 string hash — cheap content fingerprint for change detection.
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

// ── The engine: run a lens against a source ──────────────────────────────────
export const runLens = internalAction({
  args: { sourceId: v.id("sources") },
  handler: async (ctx, { sourceId }) => {
    const source = await ctx.runQuery(internal.sources.getInternal, { id: sourceId });
    if (!source) return;
    const lens = source.lens as Lens;
    await ctx.runMutation(internal.sources.setStatus, { sourceId, status: "crawling" });

    try {
      const def = LENS_DEFS[lens];
      // 1) Structured extraction — the reasoning layer for every lens.
      const ex = await extract<Record<string, any>>(source.url, def.schema, {
        instructions: def.instructions,
        maxPages: def.maxPages,
      });
      const data = ex.data ?? {};

      // 2) Raw markdown snapshot for change detection (Watch/Compare).
      let markdown: string | undefined;
      let contentHash = hash(JSON.stringify(data));
      if (lens === "watch" || lens === "compare") {
        try {
          const md = await scrapeMarkdown(source.url);
          markdown = md.markdown;
          contentHash = hash(md.markdown || JSON.stringify(data));
        } catch {
          /* extraction hash is a fine fallback */
        }
      }

      const snapshotId: Id<"snapshots"> = await ctx.runMutation(internal.sources.saveSnapshot, {
        sourceId,
        contentHash,
        markdown,
        extracted: data,
      });

      // 3) Persist lens-specific outputs.
      const entities: { type: string; name: string; props?: any }[] = [];

      if (lens === "audit") {
        for (const f of data.findings ?? []) {
          await ctx.runMutation(internal.sources.saveFinding, {
            sourceId, lens, type: f.type ?? "issue", title: f.title ?? "Finding",
            detail: f.detail, severity: f.severity, url: f.url,
          });
        }
        await ctx.runMutation(internal.sources.saveAnalysis, { sourceId, lens, content: { summary: data.summary } });
      } else if (lens === "hunt") {
        for (const o of data.opportunities ?? []) {
          await ctx.runMutation(internal.sources.saveFinding, {
            sourceId, lens, type: "opportunity", title: o.title ?? "Opportunity",
            detail: o.summary, severity: o.fit, url: o.url,
          });
          entities.push({ type: "opportunity", name: o.title, props: o });
        }
        await ctx.runMutation(internal.sources.saveAnalysis, { sourceId, lens, content: { summary: data.summary } });
      } else if (lens === "research") {
        let brand: Record<string, any> | undefined;
        try {
          const b = await retrieveBrand(source.domain);
          brand = b.brand;
        } catch { /* memo still works without brand */ }
        await ctx.runMutation(internal.sources.saveAnalysis, { sourceId, lens, content: { ...data, brand } });
        entities.push({ type: "company", name: source.domain, props: { ...data, brand } });
        for (const t of data.team ?? []) entities.push({ type: "person", name: t.name, props: t });
      } else {
        // watch + compare
        await ctx.runMutation(internal.sources.saveAnalysis, { sourceId, lens, content: data });
        for (const e of data.entities ?? []) entities.push({ type: e.type, name: e.name });
      }

      // 4) Change detection for Watch/Compare.
      if (lens === "watch" || lens === "compare") {
        const prevHash = await ctx.runMutation(internal.sources.lastSnapshotHash, { sourceId, exceptHash: contentHash });
        if (prevHash && prevHash !== contentHash) {
          const summary = data.summary ?? "The page changed.";
          const whyItMatters = (data.keyPoints ?? []).slice(0, 2).join(" · ") || undefined;
          await ctx.runMutation(internal.sources.saveChange, {
            sourceId, toSnapshotId: snapshotId, summary, whyItMatters, severity: "medium",
          });
          if (source.userId) {
            await ctx.scheduler.runAfter(0, internal.telegram.notifyUserChange, {
              userId: source.userId, domain: source.domain, lens, summary, whyItMatters,
            });
          }
        }
      }

      // 5) Feed the knowledge graph (Graph RAG / Ask lens).
      if (entities.length) {
        await ctx.runMutation(internal.graph.ingest, { sourceId, entities });
      }

      await ctx.runMutation(internal.sources.setStatus, {
        sourceId, status: "ready",
        title: data.summary ?? data.overview ?? source.domain,
      });
      if (source.telegramChatId !== undefined) {
        await ctx.scheduler.runAfter(0, internal.telegram.notifyResult, {
          sourceId, chatId: source.telegramChatId,
        });
      }
      if (source.slackResponseUrl !== undefined) {
        await ctx.scheduler.runAfter(0, internal.slack.notifyResult, {
          sourceId, responseUrl: source.slackResponseUrl,
        });
      }
    } catch (e: any) {
      await ctx.runMutation(internal.sources.setStatus, { sourceId, status: "error", error: String(e?.message ?? e) });
      if (source.telegramChatId !== undefined) {
        await ctx.scheduler.runAfter(0, internal.telegram.notifyError, {
          chatId: source.telegramChatId, domain: source.domain, error: String(e?.message ?? e),
        });
      }
    }
  },
});

// internal query used by the action (avoids exposing get twice)
export const getInternal = internalQuery({
  args: { id: v.id("sources") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});
