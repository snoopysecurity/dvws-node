const mongoose = require('mongoose');

const activityEventSchema = new mongoose.Schema({
  actor: { type: String, required: true, index: true },
  action: { type: String, required: true },
  subject: { type: String, required: true },
  occurredAt: { type: Date, default: Date.now }
}, { versionKey: false });

activityEventSchema.index({ actor: 1, occurredAt: -1, _id: -1 });

module.exports = mongoose.model('ActivityEvent', activityEventSchema);
