const users = require('./users');
const notes = require('./notes');
const passphrase = require('./passphrase');
const files = require('./files');

module.exports = (router) => {
  users(router);
  notes(router);
  passphrase(router);
  files(router);
  return router;
};
