const controller = require('../controllers/storage');
const validateToken = require('../utils').validateToken;


module.exports = (router) => {

    router.route('/upload')
      .post(controller.post);
  
      router.route('/upload')
      .get(controller.get);
  };