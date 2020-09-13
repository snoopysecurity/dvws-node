const controller = require('../controllers/storage');
const validateToken = require('../utils').validateToken;


module.exports = (router) => {

    router.route('/upload')
      .post(validateToken, controller.post);
  
      router.route('/upload')
      .get(validateToken, controller.get);
  };