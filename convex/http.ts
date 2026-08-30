import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { internal } from "./_generated/api";
import { tgSend, HELP, CONNECT_PROMPT, esc } from "./telegram";
import { verifySlack } from "./slack";

const http = httpRouter();
auth.addHttpRoutes(http);

const LENSES = new Set(["watch", "audit", "research", "compare", "hunt"]);

function slackReply(text: string, inChannel = false) {
  return new Response(JSON.stringify({ response_type: inChannel ? "in_channel" : "ephemeral", text }), {
    headers: { "Content-Type": "application/json" },
  });
}

const SLACK_HELP =
  "*Prism* — analyze any URL from Slack.\n" +
  "`/prism connect <code>` — link this Slack to your Prism account (get the code in the app)\n" +
  "`/prism research stripe.com` · `/prism audit <url>` · `/prism watch <url>` · `/prism hunt <url>` · `/prism compare <url>`\n" +
  "`/prism ask <query>` — query your knowledge graph\n" +
  "`/prism <url>` — defaults to watch";

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

// Slack slash command (/prism). Replies immediately; lens results arrive later
// via the command's response_url. No bot token or OAuth scopes required.
http.route({
  path: "/slack",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const raw = await req.text();
    const ok = await verifySlack(
      req.headers.get("x-slack-request-timestamp") ?? "",
      raw,
      req.headers.get("x-slack-signature") ?? "",
    );
    if (!ok) return new Response("invalid signature", { status: 401 });

    const form = new URLSearchParams(raw);
    const teamId = form.get("team_id") ?? "";
    const slackUserId = form.get("user_id") ?? "";
    const responseUrl = form.get("response_url") ?? "";
    const channelId = form.get("channel_id") ?? "";
    const text = (form.get("text") ?? "").trim();
    const [cmdRaw, ...rest] = text.split(/\s+/);
    const cmd = cmdRaw.toLowerCase();
    const arg = rest.join(" ").trim();

    try {
      if (!text || cmd === "help") return slackReply(SLACK_HELP);

      if (cmd === "connect") {
        if (!arg) return slackReply("Get a code from Prism → *Connect Slack*, then run `/prism connect <code>`.");
        const linked = await ctx.runMutation(internal.slack.linkSlack, { teamId, slackUserId, code: arg });
        return slackReply(linked ? ":white_check_mark: Connected to your Prism account. Try `/prism research stripe.com`." : "That code is invalid or expired. Generate a new one in the app.");
      }

      const userId = await ctx.runQuery(internal.slack.resolveSlackUser, { teamId, slackUserId });
      if (!userId) return slackReply("This Slack isn't linked yet. Open Prism → *Connect Slack* → run `/prism connect <code>`.");

      if (cmd === "ask") {
        if (!arg) return slackReply("Ask what? e.g. `/prism ask pricing`");
        const res = await ctx.runQuery(internal.graph.askForUser, { userId, q: arg });
        const ents = (res.entities || []).slice(0, 8).map((e: any) => `${e.type}: ${e.name}`).join("\n");
        return slackReply(`:brain: ${res.answer}${ents ? `\n\n${ents}` : ""}`, true);
      }

      let lens = "watch";
      let url = text;
      if (LENSES.has(cmd)) {
        if (!arg) return slackReply(`Give me a URL. e.g. \`/prism ${cmd} example.com\``);
        lens = cmd; url = arg;
      } else if (!/^https?:\/\//i.test(text) && !/^[\w-]+(\.[\w-]+)+/.test(text)) {
        return slackReply("Didn't get that — try `/prism help`");
      }
      await ctx.runMutation(internal.sources.addForUserSlack, { userId, url, lens: lens as any, responseUrl, channelId });
      return slackReply(`:mag: Running *${lens}* on *${url}*… result posts here in a moment.`, true);
    } catch (e: any) {
      return slackReply(`:warning: ${String(e?.message ?? e)}`);
    }
  }),
});

export default http;
