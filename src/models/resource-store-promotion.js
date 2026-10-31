const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
  publicId: { type: String, required: true, unique: true },
  credits: { type: Number, required: true },
  maxOrders: { type: Number, required: true },
  active: { type: Boolean, default: true }
}, { versionKey: false });

module.exports = mongoose.model('ResourceStorePromotion', promotionSchema);
