const SupportTicket = require('../models/support-ticket');
const uuidV1 = require('../services/uuid-v1');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

module.exports = {
  create: async (req, res) => {
    const { subject, message } = req.body || {};
    if (typeof subject !== 'string' || !subject.trim() || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'subject and message are required' });
    }
    try {
      const ticket = await SupportTicket.create({
        _id: uuidV1(), username: req.decoded.user,
        subject: subject.trim(), message: message.trim()
      });
      return res.status(201).json({ ticket });
    } catch (_error) {
      return res.status(500).json({ error: 'Could not create support ticket' });
    }
  },

  read: async (req, res) => {
    if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ error: 'Invalid ticket ID' });
    try {
      // Intentionally vulnerable: the query checks the UUID but omits username.
      const ticket = await SupportTicket.findById(req.params.id).lean();
      if (!ticket) return res.status(404).json({ error: 'Support ticket not found' });
      return res.json({ ticket });
    } catch (_error) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }
  }
};
