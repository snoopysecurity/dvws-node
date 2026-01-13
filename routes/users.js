const controller = require('../controllers/users');
const validateToken = require('../utils').validateToken;
const bodyParser = require('body-parser');
const rateLimiter = require('../utils/rateLimiter');

// Rate limiter for login: 100 attempts per 30 seconds
const loginLimiter = rateLimiter({ windowMs: 30 * 1000, max: 100 });

// Text parser for JSON CSRF vulnerability
const textParser = bodyParser.text({ type: 'text/plain' });

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

  router.route('/v2/users/profile')
    .get(controller.getProfile);

  router.route('/v2/admin/logs')
    .get(validateToken, controller.getLoginLogs);

  router.route('/v2/users/logout/:redirect')
    .get(controller.logout);    

  router.route('/v2/login')
    .post(loginLimiter, controller.login);

  router.route('/v2/users/logs/download')
    .get(controller.downloadLogs);

  router.route('/v2/users/profile/export/xml')
    .post(controller.exportProfileXml)
    .get(controller.exportProfileXml);

  router.route('/v2/users/profile/import/xml')
    .post(controller.importProfileXml);

  router.route('/v2/admin/create-user')
    .post(textParser, controller.adminCreateUser);

  router.route('/v2/users/ldap-search')
    .post(controller.ldapSearch)
    .get(controller.ldapSearch);
};
