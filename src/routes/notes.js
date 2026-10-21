const controller = require('../controllers/notes');
const validateToken = require('../middleware/auth').validateToken;
var guard = require('express-jwt-permissions')({
  requestProperty: 'identity',
  permissionsProperty: 'permissions'
})

module.exports = (router) => {

  router.route('/v1/info')
    .get(controller.get_info);

  router.route('/v2/info')
    .get(controller.get_info);

  router.route('/v2/release/:release')
    .get(controller.get_release);

  // Deliberately unsafe template rendering exercise (see CHALLENGES.md).
  router.route('/v2/greeter')
    .get((req, res) => {
      const name = req.query.name || 'world';
      try {
        // Compiling user input as a template allows expressions to execute.
        const render = new Function(`return \`Hello ${name}\`;`);
        res.type('text/plain').send(render());
      } catch (err) {
        res.status(400).send({ error: 'Template rendering failed', detail: err.message });
      }
    });

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

    router.route('/v2/notesearch/all')
    .get(validateToken, controller.display_all, guard.check(['user:write']));

  router.route('/v2/notes/import/xml')
    .post(validateToken, controller.import_notes_xml);

};
