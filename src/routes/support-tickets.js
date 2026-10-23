const controller = require('../controllers/support-tickets');
const validateToken = require('../middleware/auth').validateToken;

module.exports = (router) => {
  router.route('/v2/support/tickets')
    .post(validateToken, controller.create);

  router.route('/v2/support/tickets/:id')
    .get(validateToken, controller.read);
};
