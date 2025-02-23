const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: String,
  stocks: [{
    symbol: String,
    threshold: Number,
    alertAbove: Boolean // If true, alert when price is above threshold, else when below
  }]
});

const User = mongoose.model('User', userSchema);

module.exports = User;

