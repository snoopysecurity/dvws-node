const controller = require('../controllers/users');
const validateToken = require('../utils').validateToken;
var guard = require('express-jwt-permissions')({
  requestProperty: 'identity',
  permissionsProperty: 'permissions'
})

module.exports = (router) => {
  router.route('/v2/users')
    .post(controller.add)
    .get(validateToken, controller.getAll);

  router.route('/v2/users/checkadmin')
    .get(validateToken, controller.checkadmin);

  router.route('/v2/users/logout/:redirect')
    .get(controller.logout);    

  
  router.route('/v2/login')
    .post(controller.login);
};