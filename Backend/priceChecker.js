//retrieve all tracked_stocks tickers, put them in a db(that at the end of my fetch routine deletes anyhting that is older then n days), 
//then check every 30 minutes for the difference in stock price, and calculate the % change,
//if the change is significant as defined below then send an aalert through whatever alert service im using

//need to define currentPrice, currentVolume, previousPrice, previousVolume, averageVolume, timeFrameMinutes

//bonus: in future add user option to tweak thresholds for alert like 2%-4%

require('dotenv').config({ path: './creds.env' });
const mysql = require('mysql2/promise');
const yahooFinance = require('yahoo-finance2').default;
const nodemailer = require('nodemailer');
const twilio = require('twilio');

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

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function runStockAlerts() {
    const connection = await pool.getConnection();
    try {
        console.log("Running stock tracking process...");

        // Fetch tracked stocks
        const [rows] = await connection.query("SELECT ticker_symbol FROM tracked_stocks");
        const trackedStocks = rows.map(row => row.ticker_symbol);

        for (let stock of trackedStocks) {
            try {
                const result = await yahooFinance.quote(stock);

                if (result && result.regularMarketPrice) {
                    const price = result.regularMarketPrice;
                    console.log(`Fetched: ${stock} - Price: ${price}`);

                    // Store the price
                    await connection.query(
                        "INSERT INTO stock_price_history (stock_symbol, price) VALUES (?, ?)",
                        [stock, price]
                    );

                    // Check for alerts
                    await checkAndTriggerAlerts(connection, stock, price);
                }
            } catch (error) {
                console.error(`Error fetching data for ${stock}:`, error);
            }
        }

        // Clear old records
        await clearOldRecords(connection);

    } catch (error) {
        console.error("Error running stock tracking:", error);
    } finally {
        connection.release();
    }
}

async function checkAndTriggerAlerts(connection, stock, currentPrice) {
    try {
        const [prices] = await connection.query(
            `SELECT price, TIMESTAMPDIFF(MINUTE, timestamp, NOW()) as timeDiff 
             FROM stock_price_history 
             WHERE stock_symbol = ? 
             ORDER BY timestamp DESC 
             LIMIT 2`, 
            [stock]
        );

        if (prices.length < 2) return;

        const [latest, previous] = prices;
        const alertMessage = shouldTriggerAlert(previous.price, currentPrice, latest.timeDiff);

        if (alertMessage) {
            console.log(`Triggering alert for ${stock}: ${alertMessage}`);
            await sendAlerts(connection, stock, alertMessage);
        }
    } catch (error) {
        console.error("Error checking for alerts:", error);
    }
}

function shouldTriggerAlert(previousPrice, currentPrice, timeFrameMinutes) {
    const priceChange = Math.abs(((currentPrice - previousPrice) / previousPrice) * 100);

    if (Math.abs(priceChange) >= 1.5 && timeFrameMinutes <= 30) {
        return `ALERT: ${priceChange.toFixed(2)}% move in ${timeFrameMinutes} min!`;
    }
    if (Math.abs(priceChange) >= 3 && timeFrameMinutes <= 120) {
        return `ALERT: ${priceChange.toFixed(2)}% move in ${timeFrameMinutes} min!`;
    }
    return null;
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
            if (user.phone) await sendSMSAlert(user.phone, stock, alertMessage);
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
        console.error(`Error sending email to ${email}:`, error);
    }
}

async function sendSMSAlert(phone, stock, message) {
    try {
        await twilioClient.messages.create({
            body: `Stock Alert for ${stock}: ${message}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone
        });
        console.log(`SMS alert sent to ${phone}`);
    } catch (error) {
        console.error(`Error sending SMS to ${phone}:`, error);
    }
}

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
