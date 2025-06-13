# Stock Alert

Stock Alert is a real-time stock price monitoring and alerting system.  
It sends notifications via email and SMS when certain stock conditions are triggered.

---

## Features

- Real-time stock monitoring  
- Email alerts (sent from **stockalertofficial@gmail.com**)  
- User authentication using JWT  
- Persistent data storage with MySQL/MariaDB  

---

## Quick Start Guide

### Prerequisites

- Node.js (v14+)  
- MySQL or MariaDB server   
- Gmail account for recieving

---

### Clone and Install

clone github repo using link provided in github

In Bash:

cd stock-alert

npm install

Environment Variables Setup:

Create a creds.env file in the "Backend" directory of the project with the following variables: 

You need to fill in these secrets with your own values below for the app to work, the email service and pass are provided so
you dont have to set up a nodemailer service yourself

creds.env file:

DB_USER=root
DB_PASS=your_db_password_here
DB_NAME=stock_alert

JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

EMAIL_USER=stockalertofficial@gmail.com
EMAIL_PASS=cesg kwva livo aibb




Important Notes on Email
Emails are sent from a fixed address:
stockalertofficial@gmail.com (hardcoded in the code)



Database Setup
Create the database manually:

Download and Access MariaDB

Syntax:

CREATE DATABASE IF NOT EXISTS stock_alert;
USE stock_alert;

-- Users table
CREATE TABLE users (
  id INT(11) NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY email (email),
  UNIQUE KEY phone (phone)
);

-- Stock price history
CREATE TABLE stock_price_history (
  id INT(11) NOT NULL AUTO_INCREMENT,
  stock_symbol VARCHAR(10) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  market_event VARCHAR(20) DEFAULT NULL,
  PRIMARY KEY (id)
);

-- Tracked stocks (linking users to tickers)
CREATE TABLE tracked_stocks (
  id INT(11) NOT NULL AUTO_INCREMENT,
  user_id INT(11) NOT NULL,
  ticker_symbol VARCHAR(10) NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
-------------------------------------------------------------
Start the server:
(bash)cd to Backend then:

node server.js

or

npm start

The server will connect to your database and start monitoring stocks.

How to Use
Set your stock alert conditions via the web UA at port 3000

you will need to make a new account to get a JWT and be able to access the app. 

Alerts will be sent to your configured email when triggered(email that you use for account registration)
