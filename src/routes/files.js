const controller = require('../controllers/files');
const validateToken = require('../middleware/auth').validateToken;


module.exports = (router) => {

    router.route('/upload')
      .post(validateToken, controller.post);
  
      router.route('/upload')
      .get(validateToken, controller.get);

      router.route('/download')
      .post(validateToken, controller.fetch);
  };
