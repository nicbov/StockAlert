require('dotenv').config({ path: './creds.env' }); // Load environment variables

console.log(process.env);

const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const yf = require('yahoo-finance2').default;
const app = express();

app.use(express.json()); // Parse JSON requests

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
        // Check if the email already exists
        const query = 'SELECT * FROM users WHERE email = ?';
        db.query(query, [email], async (err, results) => {
            if (err) {
                console.error('Database error:', err);  // Log error to console
                return res.status(500).json({ message: 'Database error' });
            }
            if (results.length > 0) {
                return res.status(400).json({ message: 'Email already registered.' });
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new user into the database
            const insertQuery = 'INSERT INTO users (email, password_hash, phone) VALUES (?, ?, ?)';
            db.query(insertQuery, [email, hashedPassword, phone || null], (err, result) => {
                if (err) {
                    console.error('Error creating user:', err);  // Log error to console
                    return res.status(500).json({ message: 'Error creating user.' });
                }
                res.status(201).json({ message: 'User registered successfully.' });
            });
        });
    } catch (error) {
        console.error('Server error:', error);  // Log error to console
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
            console.error('Database error:', err);  // Log error to console
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

        // Generate JWT token for the user
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'supersecret', { expiresIn: '1h' });

        // Send the token back to the frontend
        res.status(200).json({ message: 'Login successful', token });
    });
});

app.get("/api/stock", async (req, res) => {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: "Stock symbol is required" });

    try {
        const result = await yf.quote(symbol);
        if (!result || !result.regularMarketPrice) throw new Error("Invalid stock symbol");
        res.json({price: result.regularMarketPrice });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch stock data" });
    }
    try {
        const query = "INSERT INTO tracked_stocks (user_id, ticker) SELECT id, ? FROM users WHERE token = ?";
        await db.query(query, [tickerSymbol, token]); // Add ticker for the authenticated user

        res.status(200).json({ message: `${tickerSymbol.toUpperCase()} is now being tracked!` });
    } catch (error) {
        console.error("Error tracking stock:", error);
        res.status(500).json({ error: "Failed to track the stock" });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
