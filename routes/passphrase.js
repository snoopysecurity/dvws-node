const controller = require('../controllers/passphrase');
const validateToken = require('../utils').validateToken;
var guard = require('express-jwt-permissions')({
  requestProperty: 'identity',
  permissionsProperty: 'permissions'
})


module.exports = (router) => {
  router.route('/v2/passphrase')
    .post(validateToken, controller.save);

  router.route('/v2/passphrase/:username')
    .get(controller.get)
};