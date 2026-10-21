const users = require('./users');
const notes = require('./notes');
const passphrase = require('./passphrase');
const files = require('./files');
const integrations = require('./integrations');

module.exports = (router) => {
  users(router);
  notes(router);
  passphrase(router);
  files(router);
  integrations(router);
  return router;
};
