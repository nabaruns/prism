import { v } from "convex/values";
import { query, internalMutation, internalQuery, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// ── slash-command signature verification ─────────────────────────────────────
// https://api.slack.com/authentication/verifying-requests-from-slack
export async function verifySlack(timestamp: string, rawBody: string, signature: string): Promise<boolean> {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) return true; // not configured yet — allow (set SLACK_SIGNING_SECRET to enforce)
  if (!timestamp || !signature) return false;
  // reject stale (>5 min) requests
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(`v0:${timestamp}:${rawBody}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `v0=${hex}` === signature;
}

const clip = (s: string | undefined, n = 300) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "");

// ── Slack mrkdwn result formatting ───────────────────────────────────────────
type Finding = { severity?: string; title?: string; detail?: string; url?: string };
export function formatBoardSlack(board: any): string {
  const { source, analyses, findings } = board;
  const a = analyses[0]?.content ?? {};
  const lens = source.lens as string;
  const head = `*${lens.toUpperCase()}* · *${source.domain}*`;
  if (lens === "audit") {
    const rows = (findings as Finding[]).slice(0, 6).map((f) => `• [${f.severity || "info"}] ${clip(f.title, 90)}${f.detail ? ` — ${clip(f.detail, 140)}` : ""}`);
    return [head, a.summary ? clip(a.summary, 400) : "", ...rows].filter(Boolean).join("\n");
  }
  if (lens === "hunt") {
    const rows = (findings as Finding[]).slice(0, 8).map((f) => `• ${clip(f.title, 90)}${f.severity ? ` (${f.severity})` : ""}${f.url ? ` — ${f.url}` : ""}`);
    return [head, `${findings.length} opportunities:`, ...rows].join("\n");
  }
  if (lens === "research") {
    const b = a.brand || {};
    const team = (a.team || []).slice(0, 4).map((t: any) => t.name).filter(Boolean).join(", ");
    return [
      head,
      b.title ? `*${b.title}*${b.slogan ? ` — ${b.slogan}` : ""}` : "",
      a.overview ? `*Overview:* ${clip(a.overview, 400)}` : "",
      a.product ? `*Product:* ${clip(a.product, 300)}` : "",
      a.pricing ? `*Pricing:* ${clip(a.pricing, 200)}` : "",
      team ? `*Team:* ${team}` : "",
    ].filter(Boolean).join("\n");
  }
  const kp = (a.keyPoints || []).slice(0, 5).map((k: string) => `• ${clip(k, 160)}`);
  return [head, a.summary ? clip(a.summary, 400) : "", ...kp].filter(Boolean).join("\n");
}

async function postToResponseUrl(responseUrl: string, text: string): Promise<void> {
  await fetch(responseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ response_type: "in_channel", text }),
  });
}

// Post to a channel via the bot token (used for later change alerts, when the
// slash command's response_url has expired). Requires the bot to be in the channel.
async function chatPost(channel: string, text: string): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return;
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ channel, text }),
  });
}

// ── account linking (reuses the shared linkCodes table) ──────────────────────
export const linkSlack = internalMutation({
  args: { teamId: v.string(), slackUserId: v.string(), code: v.string() },
  handler: async (ctx, { teamId, slackUserId, code }) => {
    const rec = await ctx.db.query("linkCodes").withIndex("by_code", (q) => q.eq("code", code)).unique();
    if (!rec) return false;
    const existing = await ctx.db.query("slackLinks").withIndex("by_slack_user", (q) => q.eq("teamId", teamId).eq("slackUserId", slackUserId)).unique();
    if (existing) await ctx.db.patch(existing._id, { userId: rec.userId });
    else await ctx.db.insert("slackLinks", { teamId, slackUserId, userId: rec.userId });
    await ctx.db.delete(rec._id);
    return true;
  },
});

export const resolveSlackUser = internalQuery({
  args: { teamId: v.string(), slackUserId: v.string() },
  handler: async (ctx, { teamId, slackUserId }): Promise<Id<"users"> | null> => {
    const link = await ctx.db.query("slackLinks").withIndex("by_slack_user", (q) => q.eq("teamId", teamId).eq("slackUserId", slackUserId)).unique();
    return link?.userId ?? null;
  },
});

// App: is the current user's Slack linked? (live)
export const isConnected = query({
  args: {},
  handler: async (ctx): Promise<boolean> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const link = await ctx.db.query("slackLinks").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    return !!link;
  },
});

// ── deliver a finished result to the slash command's response_url ────────────
export const notifyResult = internalAction({
  args: { sourceId: v.id("sources"), responseUrl: v.string() },
  handler: async (ctx, { sourceId, responseUrl }) => {
    const board = await ctx.runQuery(internal.views.boardInternal, { sourceId });
    if (board) await postToResponseUrl(responseUrl, `:white_check_mark: ${formatBoardSlack(board)}`);
  },
});

// Change alert to the Slack channel the watch was started from.
export const notifyChange = internalAction({
  args: { channelId: v.string(), domain: v.string(), lens: v.string(), summary: v.string(), whyItMatters: v.optional(v.string()) },
  handler: async (_ctx, a): Promise<void> => {
    const text = `:warning: *Change on ${a.domain}* (${a.lens})\n${clip(a.summary, 300)}${a.whyItMatters ? `\n_Why it matters:_ ${clip(a.whyItMatters, 200)}` : ""}`;
    await chatPost(a.channelId, text);
  },
});
