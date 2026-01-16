import { addWarning } from "./database.js";

const msgMap = new Map();

export async function antiSpam(ctx, config) {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const now = Date.now();

  const key = `${chatId}:${userId}`;
  const arr = msgMap.get(key) || [];
  const updated = arr.filter((t) => now - t < config.spamWindowMs);
  updated.push(now);
  msgMap.set(key, updated);

  if (updated.length >= config.spamLimit) {
    try {
      const warnData = await addWarning(userId, chatId);
      const warns = warnData?.warns || 1;

      await ctx.reply(`⚠️ Spam detected! Warning ${warns}/3`);

      if (warns >= 3) {
        await ctx.telegram.banChatMember(chatId, userId);
        await ctx.reply("🚫 User banned (3 warnings reached).");
      }
    } catch (e) {
      console.log("AntiSpam error:", e.message);
    }

    return true;
  }

  return false;
}
