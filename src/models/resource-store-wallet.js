const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, index: true },
  balance: { type: Number, required: true, default: 100 },
  redemptions: [{
    code: { type: String, required: true },
    credits: { type: Number, required: true },
    redeemedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('ResourceStoreWallet', walletSchema);
