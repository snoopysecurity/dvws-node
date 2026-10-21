const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  username: { type: String, required: true, index: true },
  seedKey: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// A deterministic seedKey means the first-use inbox remains idempotent even
// when a REST request and WebSocket connection arrive at the same time.
notificationSchema.index({ username: 1, seedKey: 1 }, { unique: true });

module.exports = mongoose.model('Notification', notificationSchema);
