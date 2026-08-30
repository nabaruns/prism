import { v } from "convex/values";
import { query, internalMutation, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

function slug(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}
function keyOf(type: string, name: string): string {
  return `${slug(type)}:${slug(name)}`;
}

// Fold entities from an extraction into the user's private knowledge graph.
export const ingest = internalMutation({
  args: {
    sourceId: v.id("sources"),
    entities: v.array(v.object({ type: v.string(), name: v.string(), props: v.optional(v.any()) })),
  },
  handler: async (ctx, { sourceId, entities }) => {
    const source = await ctx.db.get(sourceId);
    if (!source) return;
    const userId = source.userId;
    const siteKey = keyOf("site", source.domain ?? "unknown");

    await upsertEntity(ctx, userId, siteKey, "site", source.domain ?? "unknown", { url: source.url }, sourceId);
    for (const e of entities) {
      if (!e.name) continue;
      const key = keyOf(e.type, e.name);
      await upsertEntity(ctx, userId, key, e.type, e.name, e.props, sourceId);
      await ensureEdge(ctx, userId, siteKey, key, `has_${slug(e.type)}`, sourceId);
    }
  },
});

async function upsertEntity(
  ctx: any, userId: Id<"users"> | undefined, key: string, type: string, name: string, props: any, sourceId: any,
) {
  const existing = await ctx.db
    .query("entities")
    .withIndex("by_user_key", (q: any) => q.eq("userId", userId).eq("key", key))
    .unique();
  if (existing) {
    const sourceIds = existing.sourceIds.includes(sourceId) ? existing.sourceIds : [...existing.sourceIds, sourceId];
    await ctx.db.patch(existing._id, { sourceIds, props: props ?? existing.props, updatedAt: Date.now() });
  } else {
    await ctx.db.insert("entities", { userId, key, type, name, props, sourceIds: [sourceId], updatedAt: Date.now() });
  }
}

async function ensureEdge(ctx: any, userId: Id<"users"> | undefined, fromKey: string, toKey: string, rel: string, sourceId: any) {
  if (fromKey === toKey) return;
  const existing = await ctx.db
    .query("edges")
    .withIndex("by_user_from", (q: any) => q.eq("userId", userId).eq("fromKey", fromKey))
    .filter((q: any) => q.and(q.eq(q.field("toKey"), toKey), q.eq(q.field("rel"), rel)))
    .first();
  if (!existing) {
    await ctx.db.insert("edges", { userId, fromKey, toKey, rel, sourceId, createdAt: Date.now() });
  }
}

// Full graph for the live viz (current user only).
export const snapshot = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { entities: [], edges: [] };
    const entities = await ctx.db.query("entities").withIndex("by_user_key", (q) => q.eq("userId", userId)).take(300);
    const edges = await ctx.db.query("edges").withIndex("by_user_from", (q) => q.eq("userId", userId)).take(600);
    return { entities, edges };
  },
});

// Graph RAG retrieval over the user's graph. No LLM, no embeddings.
async function runAsk(ctx: any, userId: Id<"users">, q: string) {
  const query = (q ?? "").trim();
  if (!query) return { answer: "Ask something about everything Prism has crawled for you.", entities: [], edges: [] };

  const hits = await ctx.db
    .query("entities")
    .withSearchIndex("search_name", (s: any) => s.search("name", query).eq("userId", userId))
    .take(12);

  const keys = new Set(hits.map((h: any) => h.key));
  const edges: any[] = [];
  const neighborKeys = new Set<string>();
  for (const h of hits) {
    const out = await ctx.db.query("edges").withIndex("by_user_from", (e: any) => e.eq("userId", userId).eq("fromKey", h.key)).take(20);
    const inc = await ctx.db.query("edges").withIndex("by_user_to", (e: any) => e.eq("userId", userId).eq("toKey", h.key)).take(20);
    for (const e of [...out, ...inc]) { edges.push(e); neighborKeys.add(e.fromKey); neighborKeys.add(e.toKey); }
  }
  const neighbors: any[] = [];
  for (const k of neighborKeys) {
    if (keys.has(k)) continue;
    const n = await ctx.db.query("entities").withIndex("by_user_key", (e: any) => e.eq("userId", userId).eq("key", k)).unique();
    if (n) neighbors.push(n);
  }

  const byType: Record<string, string[]> = {};
  for (const h of hits) (byType[h.type] ??= []).push(h.name);
  const answer = hits.length
    ? `Found ${hits.length} match${hits.length > 1 ? "es" : ""} for "${query}" across ${new Set(hits.flatMap((h: any) => h.sourceIds)).size} source(s): ` +
      Object.entries(byType).map(([t, names]) => `${t} — ${names.slice(0, 5).join(", ")}`).join("; ") + "."
    : `Nothing in your graph matches "${query}" yet. Run a lens on a relevant source first.`;

  return { answer, entities: [...hits, ...neighbors], edges };
}

export const ask = query({
  args: { q: v.string() },
  handler: async (ctx, { q }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { answer: "Sign in to query your graph.", entities: [], edges: [] };
    return runAsk(ctx, userId, q);
  },
});

// Used by the Telegram webhook (user resolved from the linked chat).
export const askForUser = internalQuery({
  args: { userId: v.id("users"), q: v.string() },
  handler: async (ctx, { userId, q }) => runAsk(ctx, userId, q),
});
