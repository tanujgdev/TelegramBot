require('dotenv').config();
const { Client } = require('pg');

console.log("--- Checking Environment Variables ---");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "✅ Found" : "❌ Not Found");

if (process.env.DATABASE_URL) {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Supabase-এর জন্য এটি প্রয়োজন হতে পারে
    });

    client.connect()
        .then(() => {
            console.log("✅ Successfully connected to Supabase!");
            return client.query('SELECT NOW()');
        })
        .then(res => {
            console.log("🕒 Server Time from DB:", res.rows[0].now);
            process.exit(0);
        })
        .catch(err => {
            console.error("❌ Connection Error:", err.stack);
            process.exit(1);
        });
}

