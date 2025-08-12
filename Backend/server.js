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

// Scheduled stock alert phases (Mon-Fri, EST)
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

console.log(' Stock alert cron jobs scheduled.');

app.use(express.static(__dirname + '/../Frontend'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/../Frontend/index.html');
});

// **Database connection pool**
const db = mysql.createPool({
  host: 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'stock_alert',
  waitForConnections: true,  // Wait for a connection if the pool is busy
  connectionLimit: 10,       // Limit of concurrent connections
  queueLimit: 0              // No limit on the connection queue
});

console.log('Database connection pool created');
console.log('DB User:', process.env.DB_USER);
console.log('DB Name:', process.env.DB_NAME);

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
    console.error('Registration error:', error);
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
    console.error('Login error:', err);
    res.status(500).json({ message: 'Database error' });
  }
});

// Fetch Stock Data
app.get("/api/stock", async (req, res) => {
  const { symbol } = req.query;
  
  if (!symbol) {
    return res.status(400).json({ error: "Stock symbol is required" });
  }

  console.log(`Fetching stock data for symbol: ${symbol}`);

  try {
    const result = await yf.quote(symbol);
    console.log("Stock data fetched:", result);
    
    // Check if the result is valid and contains a price
    if (!result || !result.regularMarketPrice) {
      throw new Error("Invalid stock symbol or price not found");
    }

    res.json({ price: result.regularMarketPrice });
  } catch (error) {
    console.error("Error fetching stock data:", error.message);
    
    // Check for specific "invalid symbol" error based on message or result
    if (error.message.includes("Invalid stock symbol")) {
      return res.status(400).json({ error: "Incorrectly spelled ticker symbol or not found" });
    }

    // Default to internal server error for other issues
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

    try {
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
    } catch (error) {
      console.error('Track stock error:', error);
      res.status(500).json({ error: "Database error" });
    }
  });
});

app.get('/get-tracked-stocks', async (req, res) => {
  const token = req.headers['authorization']?.replace(/^Bearer\s/, "");

  if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
  }

  try {
      // Verify the JWT token and extract user info
      jwt.verify(token, process.env.JWT_SECRET || 'supersecret', async (err, decoded) => {
          if (err) {
              return res.status(401).json({ error: 'Invalid or expired token' });
          }

          const userId = decoded.userId;

          try {
            // Query for tracked stocks
            const query = 'SELECT ticker_symbol FROM tracked_stocks WHERE user_id = ?';
            const [results] = await db.execute(query, [userId]);

            // fetch the stock prices for each tracked stock
            const stocksWithPrices = [];
            for (let stock of results) {
                try {
                  const priceData = await yf.quote(stock.ticker_symbol);
                  if (priceData && priceData.regularMarketPrice) {
                      // Only return ticker and price
                      stocksWithPrices.push({
                          ticker: stock.ticker_symbol,
                          price: priceData.regularMarketPrice.toFixed(2)  // Format price as $$$
                      });
                  }
                } catch (error) {
                  console.error(`Error fetching price for ${stock.ticker_symbol}:`, error);
                  // Still include the stock but with error price
                  stocksWithPrices.push({
                    ticker: stock.ticker_symbol,
                    price: 'Error'
                  });
                }
            }

            // Send back the stock data
            res.json({ stocks: stocksWithPrices });
          } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ error: "Database error" });
          }
      });
  } catch (error) {
      console.error("Error fetching tracked stocks:", error);
      res.status(500).json({ error: "Internal server error" });
  }
});

// Untrack a Stock
app.post('/api/untrack-stock', async (req, res) => {
  const { tickerSymbol } = req.body;
  const token = req.headers['authorization']?.replace(/^Bearer\s/, "");

  if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
  }

  if (!tickerSymbol) {
      return res.status(400).json({ error: "Stock symbol is required" });
  }

  try {
      // Verify the JWT token and extract user info
      jwt.verify(token, process.env.JWT_SECRET || 'supersecret', async (err, decoded) => {
          if (err) {
              return res.status(401).json({ error: 'Invalid or expired token' });
          }

          const userId = decoded.userId;

          try {
            // Delete the tracked stock
            const query = "DELETE FROM tracked_stocks WHERE user_id = ? AND ticker_symbol = ?";
            await db.execute(query, [userId, tickerSymbol]); // Use connection pool here
            res.status(200).json({ message: `${tickerSymbol.toUpperCase()} has been untracked` });
          } catch (error) {
            console.error('Untrack stock error:', error);
            res.status(500).json({ error: "Database error" });
          }
      });
  } catch (error) {
      console.error("Error untracking stock:", error);
      res.status(500).json({ error: "Internal server error" });
  }
});


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
