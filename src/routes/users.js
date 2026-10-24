const controller = require('../controllers/users');
const validateToken = require('../middleware/auth').validateToken;
const bodyParser = require('body-parser');
const rateLimiter = require('../middleware/rate-limiter');

// Rate limiter for login: 100 attempts per 30 seconds
const loginLimiter = rateLimiter({ windowMs: 30 * 1000, max: 100 });


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

  router.put('/v2/users/profile/bio', validateToken, controller.updateProfileBio);

  router.route('/v2/users/:id/profile-details')
    .get(validateToken, controller.getUserProfileDetails);

  router.route('/v2/account-recovery/lookup')
    .post(validateToken, controller.lookupRecoveryAccount);

  router.route('/v2/account-recovery/reset')
    .post(validateToken, controller.resetAccountPassword);

  router.route('/v2/users/change-password')
    .post(validateToken, controller.changePasswordWithoutSessionRevocation);

  router.route('/v2/notifications')
    .get(validateToken, controller.getNotifications);

  router.route('/v2/notifications/:id/read')
    .put(validateToken, controller.markNotificationRead)
    // State change exposed through GET as well as the intended update method.
    .get(validateToken, controller.markNotificationRead);

  router.route('/v2/users/profile-sharing')
    .get(validateToken, controller.getProfileSharing)
    .put(validateToken, controller.updateProfileSharing);

  router.route('/v2/profile-sharing/jsonp')
    .get(controller.readSharedProfileJsonp);

  router.route('/v2/admin/logs')
    .get(validateToken, controller.getLoginLogs);

  router.route('/v2/users/logout/:redirect')
    .get(controller.logout);    

  router.route('/v2/login')
    .post(loginLimiter, controller.login)
    // Credentials in the query string can be retained in browser history and logs.
    .get(loginLimiter, controller.login);

  router.post('/v1/login', loginLimiter, (req, res) => {
    // #swagger.ignore = true
    return controller.loginLegacy(req, res);
  });

  router.route('/v2/users/profile/export/xml')
    .post(validateToken, controller.exportProfileXml);

  router.post('/v2/users/profile/restore/xml', validateToken, controller.restoreProfileXml);

  router.route('/v2/users/profile/import/xml')
    .post(controller.importProfileXml);

  router.route('/v2/admin/create-user')
    .post(bodyParser.text({ type: 'text/plain' }), controller.adminCreateUser);

  router.route('/v2/users/ldap-search')
    .post(controller.ldapSearch)
    .get(controller.ldapSearch);
};
