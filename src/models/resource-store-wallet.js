const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, index: true },
  balance: { type: Number, required: true, default: 100 }
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('ResourceStoreWallet', walletSchema);
