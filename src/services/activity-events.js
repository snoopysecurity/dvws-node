const ActivityEvent = require('../models/activity-event');

async function recordActivity(actor, action, subject) {
  try {
    await ActivityEvent.create({ actor, action, subject });
  } catch (error) {
    // An audit write must not turn a completed customer action into an error.
    console.error('Could not record account activity:', error);
  }
}

module.exports = { recordActivity };
