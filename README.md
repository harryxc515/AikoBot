<div align="center">

# 🤖🔥 Advanced Telegram AI Bot
### AI Chat • Admin System • Welcome • Broadcast • AntiSpam • MongoDB • Render Ready 🚀

<img src="https://img.shields.io/badge/Telegram-Bot-blue?style=for-the-badge&logo=telegram" />
<img src="https://img.shields.io/badge/Node.js-Telegraf-green?style=for-the-badge&logo=node.js" />
<img src="https://img.shields.io/badge/MongoDB-Database-darkgreen?style=for-the-badge&logo=mongodb" />
<img src="https://img.shields.io/badge/Deploy-Render-black?style=for-the-badge&logo=render" />

</div>

---

## ✨ Features
✅ Fast AI Chat Replies (No "thinking..." delay)  
✅ Group Reply Mode (Reply only when tagged / replied)  
✅ Anti-Spam System (Auto warn + Auto ban)  
✅ Warning System (3 warns = ban)  
✅ Admin Commands (Ban / Kick / Mute / Pin / Purge etc.)  
✅ Welcome Message System (Custom welcome with `/setwelcome`)  
✅ Full Broadcast to All Saved Chats (MongoDB)  
✅ Owner + Sudo System  
✅ Render Background Worker Ready (No Port Error)  

---

## 👑 Owner & Sudo
**Owner ID:** `8206476526`  
**Sudo ID:** `5669044543`  

---

## ⚙️ Commands List

### 🔥 Owner / Sudo Commands
| Command | Use |
|--------|-----|
| `/on` | Enable bot in chat |
| `/off` | Disable bot in chat |
| `/status` | Bot status |
| `/broadcast <msg>` | Broadcast to all saved chats |
| `/setwelcome <msg>` | Set welcome message |
| `/warn` | Warn user (reply to user) |
| `/warns` | Check warns (reply to user) |
| `/resetwarn` | Reset warns (reply to user) |
| `/ban` | Ban user (reply to user) |
| `/unban <id>` | Unban by user id or reply |
| `/kick` | Kick user (reply to user) |
| `/mute` | Mute user (reply to user) |
| `/unmute` | Unmute user (reply to user) |
| `/pin` | Pin message (reply to message) |
| `/unpin` | Unpin pinned message |
| `/purge 10` | Delete messages (reply to msg) |

---

## 🆘 Welcome Message Tags
You can use these tags inside welcome message:

- `{name}` = New member name  
- `{chat}` = Group name  

Example:
```bash
/setwelcome 👋 Hey {name}, welcome to {chat} 💖
Rules follow karo 😄🔥
```

---

## 🛠️ Installation (Local)
Clone repo and install:
```bash
npm install
```

Create `.env` file:
```env
BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
OWNER_ID=8206476526
MONGO_URI=YOUR_MONGODB_URI
DB_NAME=botdb
LOG_CHANNEL_ID=-100xxxxxxxxxx
```

Run bot:
```bash
npm start
```

---

## 🚀 Deploy on Render (No Port Error ✅)

### ✅ Correct Deploy Method
Render → **New** → **Background Worker**

Build Command:
```bash
npm install
```

Start Command:
```bash
npm start
```

### ⚠️ Important
❌ Do NOT deploy as Web Service  
✅ Use Background Worker (Telegram bot doesn’t need open ports)

---

## ❤️ Credits
Made with ❤️ by **SHNWAZ**  
Give ⭐ if you like this repo 🔥
