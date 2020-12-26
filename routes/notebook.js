const controller = require('../controllers/notebook');
const validateToken = require('../utils').validateToken;
var guard = require('express-jwt-permissions')({
  requestProperty: 'identity',
  permissionsProperty: 'permissions'
})

module.exports = (router) => {

  router.route('/v1/info')
    .get(controller.get_info);

  router.route('/v2/info')
    .get(controller.get_info);

  router.route('/v2/:release')
    .get(controller.get_release);

  router.route('/v2/sysinfo/:command')
    .get(validateToken, controller.get_sysinfo);

  router.route('/v2/notes')
    .get(validateToken, controller.list_all_notes, guard.check(['user:read']))
    .post(validateToken, controller.create_a_note, guard.check(['user:write']));

  router.route('/v2/notes/:noteId')
    .get(validateToken, controller.read_a_note, guard.check(['user:read']))
    .put(validateToken, controller.update_a_note, guard.check(['user:write']))
    .delete(validateToken, controller.delete_a_note, guard.check(['user:write']));

  router.route('/v2/notesearch')
    .post(validateToken, controller.search_note, guard.check(['user:write']));

};