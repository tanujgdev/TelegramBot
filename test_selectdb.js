const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});


async function getData() {
  try {
    // 'users' এর জায়গায় আপনার টেবিলের নাম দিন
    const res = await pool.query('SELECT * FROM "Medicine"'); 
    
    console.log("--- Data from Database ---");
    console.table(res.rows); // এটি সুন্দর একটি টেবিল আকারে ডাটা দেখাবে
    
    await pool.end(); // কানেকশন শেষ করা
  } catch (err) {
    console.error("Error fetching data:", err.message);
  }
}

getData();
