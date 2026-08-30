import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// ── low-level send ───────────────────────────────────────────────────────────
export async function tgSend(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
}

export const esc = (s: unknown = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const clip = (s: string | undefined, n = 300) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "");

export const HELP =
  "<b>Prism</b> — point me at any URL and I'll analyze it.\n\n" +
  "<b>watch</b> &lt;url&gt; — track changes\n" +
  "<b>audit</b> &lt;url&gt; — find stale/broken/contradictory content\n" +
  "<b>research</b> &lt;domain&gt; — company memo\n" +
  "<b>compare</b> &lt;url&gt; — competitor snapshot\n" +
  "<b>hunt</b> &lt;url&gt; — pull opportunities from a listing\n" +
  "<b>ask</b> &lt;query&gt; — query everything I've crawled for you\n\n" +
  "Or just send a URL. Example: <code>research stripe.com</code>";

export const CONNECT_PROMPT =
  "🔗 This chat isn't connected to a Prism account yet.\nOpen Prism, sign in, and tap <b>Connect Telegram</b> to link it.";

// ── formatting a finished board ──────────────────────────────────────────────
type Finding = { severity?: string; title?: string; detail?: string; url?: string };
function formatBoard(board: any): string {
  const { source, analyses, findings } = board;
  const a = analyses[0]?.content ?? {};
  const lens = source.lens as string;
  const head = `✅ <b>${esc(lens.toUpperCase())}</b> · <b>${esc(source.domain)}</b>`;
  if (lens === "audit") {
    const rows = (findings as Finding[]).slice(0, 6).map(
      (f) => `• <b>[${esc(f.severity || "info")}]</b> ${esc(clip(f.title, 90))}${f.detail ? ` — ${esc(clip(f.detail, 140))}` : ""}`,
    );
    return [head, a.summary ? esc(clip(a.summary, 400)) : "", ...rows].filter(Boolean).join("\n");
  }
  if (lens === "hunt") {
    const rows = (findings as Finding[]).slice(0, 8).map(
      (f) => `• ${esc(clip(f.title, 90))}${f.severity ? ` (${esc(f.severity)})` : ""}${f.url ? `\n  ${esc(f.url)}` : ""}`,
    );
    return [head, `${findings.length} opportunities:`, ...rows].join("\n");
  }
  if (lens === "research") {
    const b = a.brand || {};
    const team = (a.team || []).slice(0, 4).map((t: any) => t.name).filter(Boolean).join(", ");
    return [
      head,
      b.title ? `<b>${esc(b.title)}</b>${b.slogan ? ` — ${esc(b.slogan)}` : ""}` : "",
      a.overview ? `<b>Overview:</b> ${esc(clip(a.overview, 400))}` : "",
      a.product ? `<b>Product:</b> ${esc(clip(a.product, 300))}` : "",
      a.pricing ? `<b>Pricing:</b> ${esc(clip(a.pricing, 200))}` : "",
      team ? `<b>Team:</b> ${esc(team)}` : "",
    ].filter(Boolean).join("\n");
  }
  const kp = (a.keyPoints || []).slice(0, 5).map((k: string) => `• ${esc(clip(k, 160))}`);
  return [head, a.summary ? esc(clip(a.summary, 400)) : "", ...kp].filter(Boolean).join("\n");
}

// ── account linking ──────────────────────────────────────────────────────────
// App: create a one-time code for the "Connect Telegram" deep link.
export const createLinkCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");
    await ctx.db.insert("linkCodes", { code, userId, createdAt: Date.now() });
    return code;
  },
});

// App: is the current user's Telegram linked? (live — flips when /start completes)
export const isConnected = query({
  args: {},
  handler: async (ctx): Promise<boolean> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const link = await ctx.db.query("telegramLinks").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    return !!link;
  },
});

// Webhook: redeem a code, binding this chat to the user.
export const linkChat = internalMutation({
  args: { chatId: v.number(), code: v.string() },
  handler: async (ctx, { chatId, code }) => {
    const rec = await ctx.db.query("linkCodes").withIndex("by_code", (q) => q.eq("code", code)).unique();
    if (!rec) return false;
    const existing = await ctx.db.query("telegramLinks").withIndex("by_chat", (q) => q.eq("chatId", chatId)).unique();
    if (existing) await ctx.db.patch(existing._id, { userId: rec.userId });
    else await ctx.db.insert("telegramLinks", { chatId, userId: rec.userId });
    await ctx.db.delete(rec._id);
    return true;
  },
});

export const resolveUser = internalQuery({
  args: { chatId: v.number() },
  handler: async (ctx, { chatId }): Promise<Id<"users"> | null> => {
    const link = await ctx.db.query("telegramLinks").withIndex("by_chat", (q) => q.eq("chatId", chatId)).unique();
    return link?.userId ?? null;
  },
});

const userChats = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }): Promise<number[]> => {
    const links = await ctx.db.query("telegramLinks").withIndex("by_user", (q) => q.eq("userId", userId)).take(20);
    return links.map((l) => l.chatId);
  },
});
export { userChats };

// ── push notifications ───────────────────────────────────────────────────────
export const notifyResult = internalAction({
  args: { sourceId: v.id("sources"), chatId: v.number() },
  handler: async (ctx, { sourceId, chatId }) => {
    const board = await ctx.runQuery(internal.views.boardInternal, { sourceId });
    if (board) await tgSend(chatId, formatBoard(board));
  },
});

export const notifyError = internalAction({
  args: { chatId: v.number(), domain: v.string(), error: v.string() },
  handler: async (_ctx, { chatId, domain, error }) => {
    await tgSend(chatId, `❌ <b>${esc(domain)}</b>: ${esc(clip(error, 200))}`);
  },
});

export const notifyUserChange = internalAction({
  args: { userId: v.id("users"), domain: v.string(), lens: v.string(), summary: v.string(), whyItMatters: v.optional(v.string()) },
  handler: async (ctx, a): Promise<void> => {
    const chats: number[] = await ctx.runQuery(internal.telegram.userChats, { userId: a.userId });
    const text = `⚠️ <b>Change on ${esc(a.domain)}</b> (${esc(a.lens)})\n${esc(clip(a.summary, 300))}${a.whyItMatters ? `\n<i>Why it matters:</i> ${esc(clip(a.whyItMatters, 200))}` : ""}`;
    for (const c of chats) await tgSend(c, text);
  },
});
