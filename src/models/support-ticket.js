const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  username: { type: String, required: true, index: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
