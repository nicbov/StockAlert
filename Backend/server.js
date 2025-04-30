//server file
//Author: Nico Boving
//Date: 4/29/2025
//Purpose: This file is the main server file for the stock alert system.
//It is responsible for handling all incoming requests and responses.
//It also schedules the cron jobs for the stock alerts.

require('dotenv').config({ path: './creds.env' }); // Load environment variables
const runStockAlerts = require('./priceChecker');
const express = require('express');
const mysql = require('mysql2/promise');  
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const yf = require('yahoo-finance2').default;
const app = express();
const cron = require('node-cron');

app.use(express.json()); // Parse JSON requests

// ⏰ Scheduled stock alert phases (Mon-Fri, EST)
cron.schedule('30 9 * * 1-5', () => {
  console.log('Running OPEN phase stock alerts...');
  runStockAlerts('open');
}, { timezone: 'America/New_York' });

cron.schedule('30 12 * * 1-5', () => {
  console.log('Running MIDDAY phase stock alerts...');
  runStockAlerts('midday');
}, { timezone: 'America/New_York' });

cron.schedule('0 16 * * 1-5', () => {
  console.log('Running CLOSE phase stock alerts...');
  runStockAlerts('close');
}, { timezone: 'America/New_York' });

console.log('✅ Stock alert cron jobs scheduled.');

app.use(express.static(__dirname + '/../Frontend'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/../Frontend/index.html');
});

// **Database connection pool**
const db = mysql.createPool({
  host: 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: 'stock_alert',
  waitForConnections: true,  // Wait for a connection if the pool is busy
  connectionLimit: 10,       // Limit of concurrent connections
  queueLimit: 0              // No limit on the connection queue
});

console.log(process.env.DB_USER);
console.log(process.env.DB_PASS);

// User Registration
app.post('/register', async (req, res) => {
  const { email, password, phone } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const query = 'SELECT * FROM users WHERE email = ?';
    const [results] = await db.execute(query, [email]); // Use connection pool here

    if (results.length > 0) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertQuery = 'INSERT INTO users (email, password_hash, phone) VALUES (?, ?, ?)';
    await db.execute(insertQuery, [email, hashedPassword, phone || null]); // Use connection pool here
    res.status(201).json({ message: 'User registered successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// User Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const query = 'SELECT * FROM users WHERE email = ?';
  try {
    const [results] = await db.execute(query, [email]); // Use connection pool here
    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = results[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'supersecret', { expiresIn: '2h' });

    res.status(200).json({ message: 'Login successful', token });
  } catch (err) {
    res.status(500).json({ message: 'Database error' });
  }
});

// Fetch Stock Data
app.get("/api/stock", async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: "Stock symbol is required" });

  try {
    const result = await yf.quote(symbol);
    if (!result || !result.regularMarketPrice) throw new Error("Invalid stock symbol");
    res.json({ price: result.regularMarketPrice });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stock data" });
  }
});

// Track Stock
app.post("/api/track-stock", async (req, res) => {
  const { tickerSymbol } = req.body;  // Get ticker symbol from the body
  const token = req.headers['authorization']?.replace(/^Bearer\s/, ""); // Extract token from headers

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!tickerSymbol) {
    return res.status(400).json({ error: "Stock symbol is required" });
  }

  // Verify the JWT token and extract user info
  jwt.verify(token, process.env.JWT_SECRET || 'supersecret', async (err, decoded) => {
    if (err) {
      console.error('Token verification failed:', err); // Log error here
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const userId = decoded.userId;

    // Check if stock is already tracked
    const checkQuery = "SELECT * FROM tracked_stocks WHERE user_id = ? AND ticker_symbol = ?";
    const [results] = await db.execute(checkQuery, [userId, tickerSymbol]); // Use connection pool here

    if (results.length > 0) {
      return res.status(400).json({ message: "Stock is already being tracked" });
    }

    // Insert the tracked stock into the database
    const query = "INSERT INTO tracked_stocks (user_id, ticker_symbol) VALUES (?, ?)";
    await db.execute(query, [userId, tickerSymbol]); // Use connection pool here
    res.status(200).json({ message: `${tickerSymbol.toUpperCase()} is now being tracked!` });
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
