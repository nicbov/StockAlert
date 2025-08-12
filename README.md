# Stock Alert System

A real-time stock monitoring and alert system that tracks stock prices and sends alerts when significant price movements occur.

## Features

- **User Authentication**: Secure login/registration system with JWT tokens
- **Stock Tracking**: Add/remove stocks to your watchlist
- **Real-time Price Monitoring**: Live stock price updates
- **Automated Alerts**: Email notifications for significant price movements
- **Scheduled Monitoring**: Automated price checks at market open, midday, and close
- **Responsive UI**: Modern web interface for easy stock management

## Alert Thresholds

- **Open to Midday**: 1.0% price movement triggers alert
- **Open to Close**: 1.5% price movement triggers alert  
- **Midday to Close**: 1.5% price movement triggers alert

## Prerequisites

- Node.js (v16 or higher)
- MySQL database
- Gmail account for email alerts (or configure other email service)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Stock-Alert
   ```

2. **Install dependencies**
   ```bash
   cd Backend
   npm install
   ```

3. **Database Setup**
   - Create a MySQL database named `stock_alert`
   - Import the database schema: `mysql -u root -p stock_alert < Backend/stock_alert_dump.sql`

4. **Environment Configuration**
   - Copy `Backend/creds.env.example` to `Backend/creds.env`
   - Update the following variables:
     ```
     DB_USER=your_mysql_username
     DB_PASS=your_mysql_password
     DB_NAME=stock_alert
     JWT_SECRET=your_jwt_secret_key
     EMAIL_USER=your_gmail_address
     EMAIL_PASS=your_gmail_app_password
     ```

## Running the Application

1. **Start the backend server**
   ```bash
   cd Backend
   npm start
   # or for development with auto-restart:
   npm run dev
   ```

2. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`
   - Register a new account or login with existing credentials
   - Start tracking stocks by entering their ticker symbols

## API Endpoints

- `POST /register` - User registration
- `POST /login` - User authentication
- `GET /api/stock?symbol=AAPL` - Get current stock price
- `POST /api/track-stock` - Add stock to watchlist
- `GET /get-tracked-stocks` - Get user's tracked stocks
- `POST /api/untrack-stock` - Remove stock from watchlist

## Cron Jobs

The system automatically runs stock price checks at:
- **9:30 AM EST** - Market open
- **12:30 PM EST** - Midday
- **4:00 PM EST** - Market close

*Note: Only runs on weekdays (Monday-Friday)*

## Database Schema

### Users Table
- `id` - Primary key
- `email` - User email (unique)
- `password_hash` - Encrypted password
- `phone` - Phone number (optional)

### Tracked Stocks Table
- `id` - Primary key
- `user_id` - Foreign key to users table
- `ticker_symbol` - Stock ticker symbol

### Stock Price History Table
- `id` - Primary key
- `stock_symbol` - Stock ticker symbol
- `price` - Stock price at time of check
- `timestamp` - When the price was recorded
- `market_event` - Market phase (open/midday/close)

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify MySQL is running
   - Check database credentials in `creds.env`
   - Ensure database `stock_alert` exists

2. **Email Alerts Not Working**
   - Verify Gmail credentials in `creds.env`
   - Use App Password if 2FA is enabled
   - Check Gmail security settings

3. **Stock Data Not Loading**
   - Verify internet connection
   - Check if stock symbol is valid
   - Review server logs for API errors

### Logs

Check the console output for:
- Database connection status
- Cron job execution logs
- Stock price fetch results
- Alert trigger notifications

## Development

- **Backend**: Node.js with Express
- **Frontend**: Vanilla JavaScript with HTML/CSS
- **Database**: MySQL with connection pooling
- **Authentication**: JWT tokens with bcrypt password hashing
- **Stock Data**: Yahoo Finance API
- **Email**: Nodemailer with Gmail SMTP
- **Scheduling**: Node-cron for automated tasks

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- SQL injection prevention with parameterized queries
- Environment variable configuration for sensitive data
