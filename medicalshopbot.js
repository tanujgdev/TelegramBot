require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { Pool } = require('pg');

// ১. ডাটাবেস কানেকশন সেটআপ
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ২. টেলিগ্রাম বট কানেকশন
// যদি .env থেকে টোকেন কাজ না করে, তবে সরাসরি ' ' এর ভেতর টোকেনটি বসিয়ে দিন
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

console.log("Bot is starting...");

// ৩. মেইন মেনু কিবোর্ড (Reply Keyboard)
const mainMenuKeyboard = {
  reply_markup: {
    keyboard: [
      ['📦 Stock View', '➕ Add Medicine'],
      ['🔄 Update Price', '❌ Delete Medicine']
    ],
    resize_keyboard: true
  }
};

// ৪. স্বাগতম মেসেজ (/start)
bot.onText(/\/start/, (msg) => {
  const welcomeMsg = `স্বাগতম! আমি আপনার ইনভেন্টরি ম্যানেজমেন্ট বট। আপনি কী করতে চান নিচের মেনু থেকে সিলেক্ট করুন।`;
  bot.sendMessage(msg.chat.id, welcomeMsg, mainMenuKeyboard);
});

// ৫. বটের মূল লজিক
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  try {
    // --- Stock View ---
    if (text === '📦 Stock View') {
      const res = await pool.query('SELECT * FROM medicine ORDER BY id ASC');
      if (res.rows.length === 0) {
        return bot.sendMessage(chatId, "বর্তমানে স্টকে কোনো ওষুধ নেই।");
      }

      let stockList = "📋 **বর্তমান স্টক লিস্ট:**\n\n";
      res.rows.forEach(item => {
        stockList += `🆔 ID: ${item.id}\n💊 নাম: ${item['Medicine Name']}\n💰 দাম: ${item.Price} টাকা\n\n`;
      });
      bot.sendMessage(chatId, stockList, { parse_mode: 'Markdown' });
    }

    // --- Add Medicine UI ---
    else if (text === '➕ Add Medicine') {
      bot.sendMessage(chatId, "ওষুধ যোগ করতে নিচের ফরম্যাটে লিখে পাঠান:\n\n`Add: নাম, দাম` \n\nউদাহরণ: `Add: Napa, 10`", { parse_mode: 'Markdown' });
    }

    // --- Update Price UI ---
    else if (text === '🔄 Update Price') {
      bot.sendMessage(chatId, "ওষুধের দাম আপডেট করতে নিচের ফরম্যাটে লিখে পাঠান:\n\n`Update: ID, নতুন দাম` \n\nউদাহরণ: `Update: 2, 15`", { parse_mode: 'Markdown' });
    }

    // --- Delete Medicine UI ---
    else if (text === '❌ Delete Medicine') {
      bot.sendMessage(chatId, "ওষুধ ডিলিট করতে আইডির নাম লিখে পাঠান:\n\n`Delete: ID` \n\nউদাহরণ: `Delete: 2`", { parse_mode: 'Markdown' });
    }

    // --- ডাটা প্রসেসিং (Add: Parsing) ---
    else if (text.startsWith('Add:')) {
      const parts = text.split('Add:')[1].split(',');
      if (parts.length < 2) return bot.sendMessage(chatId, "সঠিক ফরম্যাট ব্যবহার করুন (Add: নাম, দাম)");
      
      const name = parts[0].trim();
      const price = parts[1].trim();

      await pool.query('INSERT INTO medicine ("Medicine Name", "Price") VALUES ($1, $2)', [name, price]);
      bot.sendMessage(chatId, `✅ "${name}" সফলভাবে যোগ করা হয়েছে।`, mainMenuKeyboard);
    }

    // --- ডাটা প্রসেসিং (Update: Parsing) ---
    else if (text.startsWith('Update:')) {
      const parts = text.split('Update:')[1].split(',');
      if (parts.length < 2) return bot.sendMessage(chatId, "সঠিক ফরম্যাট ব্যবহার করুন (Update: ID, দাম)");

      const id = parts[0].trim();
      const newPrice = parts[1].trim();

      const res = await pool.query('UPDATE medicine SET "Price" = $1 WHERE id = $2', [newPrice, id]);
      if (res.rowCount > 0) {
        bot.sendMessage(chatId, `✅ ID ${id}-এর নতুন দাম ${newPrice} টাকা আপডেট করা হয়েছে।`, mainMenuKeyboard);
      } else {
        bot.sendMessage(chatId, "❌ এই আইডির কোনো ওষুধ পাওয়া যায়নি।");
      }
    }

    // --- ডাটা প্রসেসিং (Delete: Parsing) ---
    else if (text.startsWith('Delete:')) {
      const id = text.split('Delete:')[1].trim();
      const res = await pool.query('DELETE FROM medicine WHERE id = $1', [id]);
      
      if (res.rowCount > 0) {
        bot.sendMessage(chatId, `❌ ID ${id} ডিলিট করা হয়েছে।`, mainMenuKeyboard);
      } else {
        bot.sendMessage(chatId, "❌ এই আইডির কোনো ওষুধ পাওয়া যায়নি।");
      }
    }

  } catch (err) {
    console.error("Error:", err.message);
    bot.sendMessage(chatId, "দুঃখিত, কোনো একটি ভুল হয়েছে। অনুগ্রহ করে টেবিল কলামের নামগুলো চেক করুন।");
  }
});

// এরর হ্যান্ডলিং (Polling Error)
bot.on('polling_error', (error) => {
  console.log("Polling Error:", error.message);
  if (error.message.includes('404')) {
    console.log("আপনার BOT_TOKEN ভুল হতে পারে। দয়া করে নতুন টোকেন নিয়ে ট্রাই করুন।");
  }
});
