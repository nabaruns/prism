import { internalQuery, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

// Sources Prism should keep an eye on autonomously.
export const monitorable = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("sources").withIndex("by_created").order("desc").take(50);
    return all.filter((s) => (s.lens === "watch" || s.lens === "compare") && s.status === "ready");
  },
});

// Cron entrypoint: re-crawl every watched source; runLens handles change detection.
export const sweep = internalAction({
  args: {},
  handler: async (ctx): Promise<{ swept: number }> => {
    const sources: Doc<"sources">[] = await ctx.runQuery(internal.monitor.monitorable, {});
    for (const s of sources) {
      await ctx.runMutation(internal.sources.setStatus, { sourceId: s._id, status: "pending" });
      await ctx.scheduler.runAfter(0, internal.sources.runLens, { sourceId: s._id });
    }
    return { swept: sources.length };
  },
});
