const Notification = require('../models/notification');

const inboxSeed = [
  { seedKey: 'account-security', message: 'A sign-in to your DVWS account was recorded from Example City.', createdAt: new Date('2026-01-15T09:00:00.000Z') },
  { seedKey: 'monthly-statement', message: 'Your monthly training statement is ready to review.', createdAt: new Date('2026-01-14T09:00:00.000Z') },
  { seedKey: 'support-ticket-update', message: 'A support ticket was updated. Ticket ID: 6f1d2a40-2f5b-11ef-9a31-0242ac120002', createdAt: new Date('2026-01-13T09:00:00.000Z') }
];

async function listForUser(username) {
  await Notification.bulkWrite(inboxSeed.map((notification) => ({
    updateOne: {
      filter: { username, seedKey: notification.seedKey },
      update: { $setOnInsert: { ...notification, username, read: false } },
      upsert: true
    }
  })));
  return Notification.find({ username }).sort({ createdAt: -1, _id: -1 }).lean();
}

async function markRead(username, id) {
  try {
    return await Notification.findOneAndUpdate(
      { _id: id, username },
      { $set: { read: true } },
      { new: true }
    ).lean();
  } catch (_error) {
    return null;
  }
}

module.exports = { listForUser, markRead };
