const users = require('./users');
const notebook = require('./notebook');
const passphrase = require('./passphrase');

module.exports = (router) => {
  users(router);
  notebook(router);
  passphrase(router);
  return router;
};