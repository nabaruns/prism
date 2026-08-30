import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { insertSource } from "./sources";

// Sample runs so a user with an empty dashboard immediately sees what Prism does —
// one per lens flavor. They stream in live.
const SAMPLES: { url: string; lens: string }[] = [
  { url: "https://stripe.com", lens: "research" },
  { url: "https://news.ycombinator.com/jobs", lens: "hunt" },
  { url: "https://convex.dev", lens: "audit" },
  { url: "https://news.ycombinator.com", lens: "watch" },
];

// Called by the app on load. Idempotent: only seeds when the user has no sources yet.
export const ensureSamples = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { seeded: 0 };
    const existing = await ctx.db.query("sources").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    if (existing) return { seeded: 0 };
    for (const s of SAMPLES) await insertSource(ctx, userId, s.url, s.lens);
    return { seeded: SAMPLES.length };
  },
});
