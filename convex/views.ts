import { v } from "convex/values";
import { query, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

async function loadBoard(ctx: any, sourceId: Id<"sources">) {
  const source = await ctx.db.get(sourceId);
  if (!source) return null;
  const [analyses, findings, changes, snapshots] = await Promise.all([
    ctx.db.query("analyses").withIndex("by_source", (q: any) => q.eq("sourceId", sourceId)).order("desc").take(10),
    ctx.db.query("findings").withIndex("by_source", (q: any) => q.eq("sourceId", sourceId)).order("desc").take(50),
    ctx.db.query("changes").withIndex("by_source", (q: any) => q.eq("sourceId", sourceId)).order("desc").take(50),
    ctx.db.query("snapshots").withIndex("by_source", (q: any) => q.eq("sourceId", sourceId)).order("desc").take(10),
  ]);
  return { source, analyses, findings, changes, snapshots };
}

// Everything the app board needs for one source (owned by the caller).
export const board = query({
  args: { sourceId: v.id("sources") },
  handler: async (ctx, { sourceId }) => {
    const userId = await getAuthUserId(ctx);
    const source = await ctx.db.get(sourceId);
    if (!source || source.userId !== userId) return null;
    return loadBoard(ctx, sourceId);
  },
});

// Internal loader for Telegram push notifications (no auth context).
export const boardInternal = internalQuery({
  args: { sourceId: v.id("sources") },
  handler: async (ctx, { sourceId }) => loadBoard(ctx, sourceId),
});
