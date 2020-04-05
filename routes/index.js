const users = require('./users');
const notebook = require('./notebook');

module.exports = (router) => {
  users(router);
  notebook(router);
  return router;
};