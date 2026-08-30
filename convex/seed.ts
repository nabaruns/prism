import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { insertSource } from "./sources";

// Sample runs so a brand-new user lands on a populated dashboard and immediately
// sees what Prism does — one per lens flavor. They stream in live.
const SAMPLES: { url: string; lens: string }[] = [
  { url: "https://stripe.com", lens: "research" },
  { url: "https://news.ycombinator.com/jobs", lens: "hunt" },
  { url: "https://convex.dev", lens: "audit" },
  { url: "https://news.ycombinator.com", lens: "watch" },
];

export const sampleRuns = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // Idempotent: only seed if this user has no sources yet.
    const existing = await ctx.db
      .query("sources")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) return;
    for (const s of SAMPLES) {
      await insertSource(ctx, userId, s.url, s.lens);
    }
  },
});
