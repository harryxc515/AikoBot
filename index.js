import "dotenv/config";
import { Telegraf, Markup } from "telegraf";
import { config } from "./config.js";
import {
  connectDB,
  getChatSettings,
  setChatEnabled,
  getWarnings,
  resetWarnings,
  addWarning,
  saveChat,
  getAllChats,
  setWelcome,
  getWelcome
} from "./database.js";
import { antiSpam } from "./antiSpam.js";

const BOT_TOKEN = process.env.BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OWNER_ID = Number(process.env.OWNER_ID || config.ownerId || 0);
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

if (!BOT_TOKEN) {
  console.log("❌ BOT_TOKEN missing");
  process.exit(1);
}
if (!OPENAI_API_KEY) {
  console.log("❌ OPENAI_API_KEY missing");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const memory = new Map();

const SYSTEM_PROMPT = `
You are an advanced Telegram AI assistant.
Rules:
- Reply fast, short, smart.
- Use Hinglish if user uses Hinglish.
- No "thinking..." messages.
- Be friendly and helpful.
`;

function isOwner(ctx) {
  return OWNER_ID && ctx.from?.id === OWNER_ID;
}
function isSudo(ctx) {
  return config.sudoUsers?.includes(ctx.from?.id);
}
function isOwnerOrSudo(ctx) {
  return isOwner(ctx) || isSudo(ctx);
}

async function askAI(messages) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens
    })
  });

  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || "❌ No reply.";
}

async function logToChannel(ctx, text) {
  if (!LOG_CHANNEL_ID) return;
  try {
    await ctx.telegram.sendMessage(LOG_CHANNEL_ID, text);
  } catch {}
}

async function getTargetUser(ctx) {
  return ctx.message?.reply_to_message?.from || null;
}

function isGroup(ctx) {
  return ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
}

async function botIsAdmin(ctx) {
  try {
    const me = await ctx.telegram.getMe();
    const m = await ctx.telegram.getChatMember(ctx.chat.id, me.id);
    return ["administrator", "creator"].includes(m.status);
  } catch {
    return false;
  }
}

async function canDeleteMessages(ctx) {
  try {
    const me = await ctx.telegram.getMe();
    const m = await ctx.telegram.getChatMember(ctx.chat.id, me.id);
    return m?.can_delete_messages === true || m.status === "creator";
  } catch {
    return false;
  }
}

await connectDB();

/* ✅ SAVE CHAT ALWAYS */
bot.use(async (ctx, next) => {
  try {
    if (ctx.chat?.id) {
      await saveChat(ctx.chat.id, ctx.chat?.title || "");
    }
  } catch {}
  return next();
});

/* ✅ START */
bot.start(async (ctx) => {
  const ownerBtn = Markup.inlineKeyboard([
    Markup.button.url("👑 Owner", `tg://user?id=${OWNER_ID}`),
    Markup.button.callback("🆘 Support", "SUPPORT")
  ]);

  await ctx.reply(
    "🤖 Advanced AI Bot Online ✅\n\n✨ Type anything to chat 😄\n📌 In groups: tag me or reply to me.",
    ownerBtn
  );
});

/* ✅ SUPPORT */
bot.action("SUPPORT", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    `${config.supportText}\n👑 Owner: ${OWNER_ID}`,
    Markup.inlineKeyboard([
      Markup.button.url("👑 Contact Owner", `tg://user?id=${OWNER_ID}`)
    ])
  );
});

/* ✅ AUTO WELCOME */
bot.on("new_chat_members", async (ctx) => {
  if (!isGroup(ctx)) return;

  const data = await getWelcome(ctx.chat.id);
  const welcomeText =
    data?.text || "👋 Welcome {name} to {chat} 💖\nEnjoy your stay 😄";

  for (const member of ctx.message.new_chat_members) {
    const name = member.first_name || "User";
    const chat = ctx.chat.title || "Group";

    const msg = welcomeText
      .replaceAll("{name}", name)
      .replaceAll("{chat}", chat);

    await ctx.reply(
      msg,
      Markup.inlineKeyboard([
        Markup.button.url("👑 Owner", `tg://user?id=${OWNER_ID}`)
      ])
    );
  }
});

/* ✅ STATUS */
bot.command("status", async (ctx) => {
  const settings = await getChatSettings(ctx.chat.id);
  ctx.reply(
    `📊 Bot Status\n\n✅ Enabled: ${settings.enabled}\n👤 Chat: ${
      ctx.chat.title || "Private"
    }\n👑 Owner: ${OWNER_ID}\n🛡️ Sudo: ${config.sudoUsers?.join(", ")}`
  );
});

/* ✅ ON/OFF */
bot.command("on", async (ctx) => {
  if (!isOwnerOrSudo(ctx)) return ctx.reply("❌ Only Owner/Sudo can use this.");
  await setChatEnabled(ctx.chat.id, true);
  ctx.reply("✅ Bot Enabled in this chat.");
});

bot.command("off", async (ctx) => {
  if (!isOwnerOrSudo(ctx)) return ctx.reply("❌ Only Owner/Sudo can use this.");
  await setChatEnabled(ctx.chat.id, false);
  ctx.reply("🚫 Bot Disabled in this chat.");
});

/* ✅ SETWELCOME */
bot.command("setwelcome", async (ctx) => {
  if (!isOwnerOrSudo(ctx)) return ctx.reply("❌ Only Owner/Sudo can use this.");
  if (!isGroup(ctx)) return ctx.reply("❌ Works only in groups.");

  const text = ctx.message.text.replace("/setwelcome", "").trim();
  if (!text)
    return ctx.reply(
      "Usage:\n/setwelcome Welcome {name} 😄\n\nTags:\n{name} = user name\n{chat} = group name"
    );

  await setWelcome(ctx.chat.id, text);
  ctx.reply("✅ Welcome message saved!");
});

/* ✅ BROADCAST ALL SAVED CHATS */
bot.command("broadcast", async (ctx) => {
  if (!isOwnerOrSudo(ctx)) return ctx.reply("❌ Only Owner/Sudo can use this.");

  const msg = ctx.message.text.replace("/broadcast", "").trim();
  if (!msg) return ctx.reply("Usage: /broadcast your message");

  const chats = await getAllChats();
  if (!chats.length) return ctx.reply("❌ No chats saved in DB.");

  let sent = 0;
  let failed = 0;

  await ctx.reply(`📢 Broadcasting to ${chats.length} chats...`);

  for (const c of chats) {
    try {
      await ctx.telegram.sendMessage(c.chatId, `📢 Broadcast:\n\n${msg}`);
      sent++;
    } catch {
      failed++;
    }
  }

  ctx.reply(`✅ Broadcast Done\n\n📤 Sent: ${sent}\n❌ Failed: ${failed}`);
});

/* ✅ ADMIN COMMANDS */
bot.command("ban", async (ctx) => {
  if (!isOwnerOrSudo(ctx)) return ctx.reply("❌ Only Owner/Sudo can use this.");
  if (!isGroup(ctx)) return ctx.reply("❌ Works only in groups.");

  const user = await getTargetUser(ctx);
  if (!user) return ctx.reply("Reply to a user message to ban.");

  if (!(await botIsAdmin(ctx))) return ctx.reply("❌ Make me admin first 😅");

  await ctx.telegram.banChatMember(ctx.chat.id, user.id);
  ctx.reply(`🚫 Banned: ${user.first_name}`);
});

bot.command("unban", async (ctx) => {
  if (!isOwnerOrSudo(ctx)) return ctx.reply("❌ Only Owner/Sudo can use this.");
  if (!isGroup(ctx)) return ctx.reply("❌ Works only in groups.");

  if (!(await botIsAdmin(ctx))) return ctx.reply("❌ Make me admin first 😅");

  const replyUser = await getTargetUser(ctx);
  const args = ctx.message.text.split(" ");
  const userId = replyUser?.id || Number(args[1]);

  if (!userId) return ctx.reply("Use: /unban (reply user) OR /unban user_id");

  try {
    await ctx.telegram.unbanChatMember(ctx.chat.id, userId);
    ctx.reply(`✅ Unbanned: ${userId}`);
  } catch {
    ctx.reply("❌ Unban failed.");
  }
});

bot.command("kick", async (ctx) => {
  if (!isOwnerOrSudo(ctx)) return ctx.reply("❌ Only Owner/Sudo can use this.");
  if (!isGroup(ctx)) return ctx.reply("❌ Works only in groups.");

  const user = await getTargetUser(ctx);
  if (!user) return ctx.reply("Reply to a user message to kick.");

  if (!(await botIsAdmin(ctx))) return ctx.reply("❌ Make me admin first 😅");

  await ctx.telegram.banChatMember(ctx.chat.id, user.id);
  await ctx.telegram.unbanChatMember(ctx.chat.id, user.id);

  ctx.reply(`👢 Kicked: ${user.first_name}`);
});

bot.command("pin", async (ctx) => {
  if (!isOwnerOrSudo(ctx)) return ctx.reply("❌ Only Owner/Sudo can use this.");
  if (!isGroup(ctx)) return ctx.reply("❌ Works only in groups.");

  const msgId = ctx.message.reply_to_message?.message_id;
  if (!msgId) return ctx.reply("Reply to a message to pin it.");

  if (!(await botIsAdmin(ctx))) return ctx.reply("❌ Make me admin first 😅");

  try {
    await ctx.telegram.pinChatMessage(ctx.chat.id, msgId);
    ctx.reply("📌 Pinned ✅");
  } catch {
    ctx.reply("❌ Pin failed.");
  }
});

bot.command("unpin", async (ctx) => {
  if (!isOwnerOrSudo(ctx)) return ctx.reply("❌ Only Owner/Sudo can use this.");
  if (!isGroup(ctx)) return ctx.reply("❌ Works only in groups.");

  if (!(await botIsAdmin(ctx))) return ctx.reply("❌ Make me admin first 😅");

  try {
    await ctx.telegram.unpinChatMessage(ctx.chat.id);
    ctx.reply("✅ Unpinned.");
  } catch {
    ctx.reply("❌ Unpin failed.");
  }
});

bot.command("purge", async (ctx) => {
  if (!isOwnerOrSudo(ctx)) return ctx.reply("❌ Only Owner/Sudo can use this.");
  if (!isGroup(ctx)) return ctx.reply("❌ Works only in groups.");

  const canDel = await canDeleteMessages(ctx);
  if (!canDel) return ctx.reply("❌ Give me Delete Messages permission 😅");

  const args = ctx.message.text.split(" ");
  const count = Math.min(Number(args[1] || 10), 50);
  const replyMsg = ctx.message.reply_to_message?.message_id;

  if (!replyMsg) return ctx.reply("Reply to a message then use: /purge 10");

  let deleted = 0;
  for (let i = 0; i < count; i++) {
    try {
      await ctx.telegram.deleteMessage(ctx.chat.id, replyMsg - i);
      deleted++;
    } catch {}
  }

  ctx.reply(`🧹 Purge Done ✅\n🗑️ Deleted: ${deleted}`);
});

/* ✅ AI CHAT */
bot.on("text", async (ctx) => {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const text = ctx.message.text;

  const settings = await getChatSettings(chatId);
  if (!settings.enabled) return;

  if (ctx.chat.type !== "private" && config.groupReplyOnlyTag) {
    const me = await bot.telegram.getMe();
    const tag = `@${me.username}`;
    if (!text.includes(tag) && !ctx.message.reply_to_message) return;
  }

  const blocked = await antiSpam(ctx, config);
  if (blocked) return;

  const key = `${chatId}:${userId}`;
  const history = memory.get(key) || [];
  const shortHistory = history.slice(-config.memoryLimit);

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...shortHistory,
    { role: "user", content: text }
  ];

  try {
    const reply = await askAI(messages);

    memory.set(key, [
      ...shortHistory,
      { role: "user", content: text },
      { role: "assistant", content: reply }
    ]);

    await ctx.reply(reply);
  } catch (e) {
    console.log("AI Error:", e.message);
    ctx.reply("❌ Error aa gaya 😅");
  }
});

bot.launch();
console.log("🚀 Advanced AI Bot Running...");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
