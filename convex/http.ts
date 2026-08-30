import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { internal } from "./_generated/api";
import { tgSend, HELP, CONNECT_PROMPT, esc } from "./telegram";

const http = httpRouter();
auth.addHttpRoutes(http);

const LENSES = new Set(["watch", "audit", "research", "compare", "hunt"]);

// Telegram webhook — the deployed chat interface. Registered via setWebhook to
// <CONVEX_SITE_URL>/telegram.
http.route({
  path: "/telegram",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    let update: any;
    try {
      update = await req.json();
    } catch {
      return new Response("bad request", { status: 400 });
    }
    const msg = update?.message;
    const chatId: number | undefined = msg?.chat?.id;
    const text: string = (msg?.text ?? "").trim();
    if (!chatId || !text) return new Response("ok");

    const [cmdRaw, ...rest] = text.split(/\s+/);
    const cmd = cmdRaw.toLowerCase().replace(/^\//, "");
    const arg = rest.join(" ").trim();

    try {
      // Connect flow: /start <code> from the "Connect Telegram" deep link.
      if (cmd === "start" && arg) {
        const ok = await ctx.runMutation(internal.telegram.linkChat, { chatId, code: arg });
        await tgSend(chatId, ok ? "✅ Connected to your Prism account. Send a URL or /help." : "That link code is invalid or expired. Generate a new one in the app.");
        return new Response("ok");
      }
      if (cmd === "start" || cmd === "help") {
        await tgSend(chatId, HELP);
        return new Response("ok");
      }

      // Everything else requires a linked account.
      const userId = await ctx.runQuery(internal.telegram.resolveUser, { chatId });
      if (!userId) {
        await tgSend(chatId, CONNECT_PROMPT);
        return new Response("ok");
      }

      if (cmd === "ask") {
        if (!arg) await tgSend(chatId, "Ask what? e.g. <code>ask pricing</code>");
        else {
          const res = await ctx.runQuery(internal.graph.askForUser, { userId, q: arg });
          const ents = (res.entities || []).slice(0, 8).map((e: any) => `${esc(e.type)}: ${esc(e.name)}`).join("\n");
          await tgSend(chatId, `🧠 ${esc(res.answer)}${ents ? `\n\n${ents}` : ""}`);
        }
      } else if (LENSES.has(cmd)) {
        if (!arg) await tgSend(chatId, `Give me a URL. e.g. <code>${cmd} example.com</code>`);
        else {
          await ctx.runMutation(internal.sources.addForUser, { userId, url: arg, lens: cmd as any, telegramChatId: chatId });
          await tgSend(chatId, `🔎 Running <b>${esc(cmd)}</b> on <b>${esc(arg)}</b>… I'll post the result here.`);
        }
      } else if (/^https?:\/\//i.test(text) || /^[\w-]+(\.[\w-]+)+/.test(text)) {
        await ctx.runMutation(internal.sources.addForUser, { userId, url: text, lens: "watch", telegramChatId: chatId });
        await tgSend(chatId, `🔎 Watching <b>${esc(text)}</b>… I'll post changes here.`);
      } else {
        await tgSend(chatId, "Didn't get that — try /help");
      }
    } catch (e: any) {
      await tgSend(chatId, `⚠️ ${esc(String(e?.message ?? e))}`);
    }
    return new Response("ok");
  }),
});

export default http;
