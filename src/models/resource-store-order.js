const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  username: { type: String, required: true, index: true },
  itemId: { type: String, required: true },
  itemName: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  quantity: { type: Number, required: true },
  creditChange: { type: Number, required: true },
  supplier: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = mongoose.model('ResourceStoreOrder', orderSchema);
