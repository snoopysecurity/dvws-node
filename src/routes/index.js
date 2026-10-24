const users = require('./users');
const notes = require('./notes');
const passphrase = require('./passphrase');
const files = require('./files');
const integrations = require('./integrations');
const supportTickets = require('./support-tickets');
const resourceStore = require('./resource-store');

module.exports = (router) => {
  users(router);
  notes(router);
  passphrase(router);
  files(router);
  integrations(router);
  supportTickets(router);
  resourceStore(router);
  return router;
};
