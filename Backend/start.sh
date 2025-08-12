#!/bin/bash

echo "🚀 Starting Stock Alert Server..."
echo "📊 Database: $DB_NAME"
echo "👤 User: $DB_USER"
echo "🌐 Port: ${PORT:-3000}"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the server
echo "✅ Starting server..."
node server.js
