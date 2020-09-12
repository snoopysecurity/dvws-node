const users = require('./users');
const notebook = require('./notebook');
const passphrase = require('./passphrase');
const storage = require('./storage');

module.exports = (router) => {
  users(router);
  notebook(router);
  passphrase(router);
  storage(router);
  return router;
};