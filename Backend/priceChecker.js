//retrieve all tracked_stocks tickers, put them in a db(that at the end of my fetch routine deletes anyhting that is older then n days), 
//then check every 30 minutes for the difference in stock price, and calculate the % change,
//if the change is significant as defined below then send an aalert through whatever alert service im using

//need to define currentPrice, currentVolume, previousPrice, previousVolume, averageVolume, timeFrameMinutes

//bonus: in future add user option to tweak thresholds for alert like 2%-4%

require('dotenv').config({ path: './creds.env' });
const mysql = require('mysql2/promise');
const yahooFinance = require('yahoo-finance2').default;
const nodemailer = require('nodemailer');

const pool = mysql.createPool({
    host: 'localhost', 
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 100, 
    queueLimit: 0
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Set this in your scheduler (server.js) as 'open', 'midday', or 'close'
async function runStockAlerts(phase) {
    const validPhases = ['open', 'midday', 'close'];
    if (!validPhases.includes(phase)) {
        console.error(`Invalid phase "${phase}". Must be one of: ${validPhases.join(', ')}`);
        return;
    }

    const connection = await pool.getConnection();
    try {
        console.log(`Running stock alerts for phase: ${phase}`);

        const [rows] = await connection.query("SELECT ticker_symbol FROM tracked_stocks");
        const trackedStocks = rows.map(row => row.ticker_symbol);

        for (let stock of trackedStocks) {
            try {
                const result = await yahooFinance.quote(stock);
                if (result && result.regularMarketPrice) {
                    const price = result.regularMarketPrice;
                    console.log(`Fetched: ${stock} - ${price} (${phase})`);

                    // Insert price with phase label
                    await connection.query(
                        "INSERT INTO stock_price_history (stock_symbol, price, phase) VALUES (?, ?, ?)",
                        [stock, price, phase]
                    );

                    // Check alerts (only for midday or close)
                    if (phase !== 'open') {
                        await checkAndTriggerAlerts(connection, stock, price, phase);
                    }
                }
            } catch (error) {
                console.error(`Error fetching data for ${stock}:`, error);
            }
        }

        // Leave this unchanged
        await clearOldRecords(connection);

    } catch (error) {
        console.error("Error in runStockAlerts:", error);
    } finally {
        connection.release();
    }
}

async function checkAndTriggerAlerts(connection, stock, currentPrice, phase) {
    try {
        const [rows] = await connection.query(
            `SELECT phase, price FROM stock_price_history 
             WHERE stock_symbol = ? AND DATE(timestamp) = CURDATE()`,
            [stock]
        );

        const prices = {};
        for (let row of rows) {
            prices[row.phase] = row.price;
        }

        const alerts = [];

        if (phase === 'midday' && prices.open) {
            const change = Math.abs((currentPrice - prices.open) / prices.open * 100);
            if (change >= 1.0) {
                alerts.push(`ALERT: ${stock} moved ${change.toFixed(2)}% from open to midday`);
            }
        }

        if (phase === 'close') {
            if (prices.open) {
                const changeFromOpen = Math.abs((currentPrice - prices.open) / prices.open * 100);
                if (changeFromOpen >= 1.5) {
                    alerts.push(`ALERT: ${stock} moved ${changeFromOpen.toFixed(2)}% from open to close`);
                }
            }

            if (prices.midday) {
                const changeFromMidday = Math.abs((currentPrice - prices.midday) / prices.midday * 100);
                if (changeFromMidday >= 1.5) {
                    alerts.push(`ALERT: ${stock} moved ${changeFromMidday.toFixed(2)}% from midday to close`);
                }
            }
        }

        for (let message of alerts) {
            console.log(`Triggering alert for ${stock}: ${message}`);
            await sendAlerts(connection, stock, message);
        }

    } catch (error) {
        console.error(`Error checking alerts for ${stock}:`, error);
    }
}

async function sendAlerts(connection, stock, alertMessage) {
    try {
        const [users] = await connection.query(
            `SELECT users.email, users.phone FROM users
             JOIN tracked_stocks ON users.id = tracked_stocks.user_id
             WHERE tracked_stocks.ticker_symbol = ?`,
            [stock]
        );

        for (let user of users) {
            if (user.email) await sendEmailAlert(user.email, stock, alertMessage);
        }
    } catch (error) {
        console.error("Error sending alerts:", error);
    }
}

async function sendEmailAlert(email, stock, message) {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: `Stock Alert for ${stock}`,
            text: message
        });
        console.log(`Email alert sent to ${email}`);
    } catch (error) {
        console.error(`Email failed (${email}):`, error);
    }
}

// DO NOT TOUCH
async function clearOldRecords(connection) {
    try {
        const query = "DELETE FROM stock_price_history WHERE timestamp < NOW() - INTERVAL 2 DAY";
        const [result] = await connection.query(query);
        console.log(`Deleted ${result.affectedRows} old records.`);
    } catch (error) {
        console.error("Error clearing old records:", error);
    }
}

module.exports = runStockAlerts;
