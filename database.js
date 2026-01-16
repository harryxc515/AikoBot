import { MongoClient } from "mongodb";

let client;
let db;

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  const dbName = process.env.DB_NAME || "Cluster0";

  if (!uri) {
    console.log("⚠️ MONGO_URI not found, running without DB (RAM mode).");
    return null;
  }

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);

  console.log("✅ MongoDB Connected");
  return db;
}

export function getDB() {
  return db;
}

/* ✅ SAVE CHAT FOR BROADCAST */
export async function saveChat(chatId, title = "") {
  if (!db) return null;
  const col = db.collection("chats");

  await col.updateOne(
    { chatId },
    { $set: { chatId, title, updatedAt: new Date() } },
    { upsert: true }
  );

  return true;
}

export async function getAllChats() {
  if (!db) return [];
  const col = db.collection("chats");
  return await col.find({}).toArray();
}

/* ✅ BOT ON/OFF */
export async function getChatSettings(chatId) {
  if (!db) return { enabled: true };

  const col = db.collection("settings");
  const data = await col.findOne({ chatId });
  return data || { chatId, enabled: true };
}

export async function setChatEnabled(chatId, enabled) {
  if (!db) return { chatId, enabled };

  const col = db.collection("settings");
  await col.updateOne(
    { chatId },
    { $set: { chatId, enabled } },
    { upsert: true }
  );
  return { chatId, enabled };
}

/* ✅ WARN SYSTEM */
export async function addWarning(userId, chatId) {
  if (!db) return { warns: 1 };

  const col = db.collection("warnings");
  const res = await col.findOneAndUpdate(
    { userId, chatId },
    { $inc: { warns: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return res.value;
}

export async function resetWarnings(userId, chatId) {
  if (!db) return { warns: 0 };

  const col = db.collection("warnings");
  await col.deleteOne({ userId, chatId });
  return { warns: 0 };
}

export async function getWarnings(userId, chatId) {
  if (!db) return { warns: 0 };

  const col = db.collection("warnings");
  return (await col.findOne({ userId, chatId })) || { warns: 0 };
}

/* ✅ WELCOME SYSTEM */
export async function setWelcome(chatId, text) {
  if (!db) return { chatId, text };

  const col = db.collection("welcome");
  await col.updateOne(
    { chatId },
    { $set: { chatId, text } },
    { upsert: true }
  );

  return { chatId, text };
}

export async function getWelcome(chatId) {
  if (!db) return { text: null };

  const col = db.collection("welcome");
  return (await col.findOne({ chatId })) || { text: null };
}
