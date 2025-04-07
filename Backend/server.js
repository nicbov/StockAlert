require('dotenv').config({ path: './creds.env' }); // Load environment variables
const runStockAlerts = require('./priceChecker');
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const yf = require('yahoo-finance2').default;
const app = express();

app.use(express.json()); // Parse JSON requests

runStockAlerts();
setInterval(runStockAlerts, 30 * 60 * 1000);

app.use(express.static(__dirname + '/../Frontend'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/../Frontend/index.html');
});

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: 'stock_alert'
});

console.log(process.env.DB_USER);
console.log(process.env.DB_PASS);

db.connect(err => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1); // Exit on failure
  }
  console.log('Connected to MySQL database.');
});

// User Registration
app.post('/register', async (req, res) => {
  const { email, password, phone } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], async (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      if (results.length > 0) {
        return res.status(400).json({ message: 'Email already registered.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const insertQuery = 'INSERT INTO users (email, password_hash, phone) VALUES (?, ?, ?)';
      db.query(insertQuery, [email, hashedPassword, phone || null], (err, result) => {
        if (err) {
          return res.status(500).json({ message: 'Error creating user.' });
        }
        res.status(201).json({ message: 'User registered successfully.' });
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// User Login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const query = 'SELECT * FROM users WHERE email = ?';
  db.query(query, [email], async (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }
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
  });
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
app.post("/api/track-stock", (req, res) => {
  const { tickerSymbol } = req.body;  // Get ticker symbol from the body
  const token = req.headers['authorization'].replace(/^Bearer\s/, ""); // Extract token from headers

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!tickerSymbol) {
    return res.status(400).json({ error: "Stock symbol is required" });
  }

  // Verify the JWT token and extract user info
  jwt.verify(token, process.env.JWT_SECRET || 'supersecret', (err, decoded) => {
    if (err) {
      console.error('Token verification failed:', err); // Log error here
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const userId = decoded.userId;

    // Check if stock is already tracked
    const checkQuery = "SELECT * FROM tracked_stocks WHERE user_id = ? AND ticker_symbol = ?";
    db.query(checkQuery, [userId, tickerSymbol], (err, results) => {
        if (err) {
            console.error("Error checking tracked stocks:", err);
            return res.status(500).json({ error: "Failed to check tracked stocks" });
        }

        if (results.length > 0) {
            return res.status(400).json({ message: "Stock is already being tracked" });
        }

        // Insert the tracked stock into the database
        const query = "INSERT INTO tracked_stocks (user_id, ticker_symbol) VALUES (?, ?)";
        db.query(query, [userId, tickerSymbol], (err, result) => {
          if (err) {
            console.error("Error tracking stock:", err);
            return res.status(500).json({ error: "Failed to track the stock" });
          }
          res.status(200).json({ message: `${tickerSymbol.toUpperCase()} is now being tracked!` });
        });
    });
  });
});

app.get("/tracked_stocks", (req, res) => {
    const token = req.headers['authorization']?.replace(/^Bearer\s/, "");

    console.log("Received token in request header:", token);

    if (!token) {
        return res.status(401).json({ error: "Authentication required" });
    }


    // Verify the JWT token and extract user info
    jwt.verify(token, process.env.JWT_SECRET || 'supersecret', async (err, decoded) => {
        if (err) {
            console.error('Token verification failed:', err); // Log error here
            return res.status(401).json({ error: "Invalid or expired token" });
        }

        const userId = decoded.userId;

        // Query the database to get all tracked stocks for the logged-in user
        const query = "SELECT ticker_symbol FROM tracked_stocks WHERE user_id = ?";
        db.query(query, [userId], async (err, results) => {
            if (err) {
                console.error("Error retrieving tracked stocks:", err);
                return res.status(500).json({ error: "Failed to retrieve tracked stocks" });
            }

            if (results.length === 0) {
                return res.status(200).json([]); // No tracked stocks
            }

            // Now we need to fetch the stock prices
            const stockSymbols = results.map(row => row.ticker_symbol);

            // Fetch all stock prices asynchronously
            const stockPricePromises = stockSymbols.map(symbol => {
                return yf.quote(symbol)
                    .then(stockData => ({
                        ticker: symbol,
                        price: stockData.regularMarketPrice || 'Price not available'
                    }))
                    .catch(() => ({
                        ticker: symbol,
                        price: 'Error fetching price'
                    }));
            });

            try {
                // Wait for all stock price fetches to complete
                const stockPrices = await Promise.all(stockPricePromises);
                res.status(200).json(stockPrices);
            } catch (error) {
                console.error('Error fetching stock prices:', error);
                res.status(500).json({ error: 'Error fetching stock prices' });
            }
        });
    });
});

//untrack stock
app.post('/untrack-stock', (req, res) => {
    const { tickerSymbol } = req.body;
    const token = req.headers['authorization']?.replace(/^Bearer\s/, "");

    if (!token) {
        return res.status(401).json({ error: "Authentication required" });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'supersecret', (err, decoded) => {
        if (err) {
            console.error('Token verification failed:', err);
            return res.status(401).json({ error: "Invalid or expired token" });
        }

        const userId = decoded.userId;

        // Remove the stock from the tracked stocks table
        const query = "DELETE FROM tracked_stocks WHERE user_id = ? AND ticker_symbol = ?";
        db.query(query, [userId, tickerSymbol], (err, results) => {
            if (err) {
                console.error("Error untracking stock:", err);
                return res.status(500).json({ error: "Failed to untrack stock" });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ message: "Stock not found in tracked stocks" });
            }

            res.status(200).json({ message: `${tickerSymbol} has been untracked` });
        });
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
