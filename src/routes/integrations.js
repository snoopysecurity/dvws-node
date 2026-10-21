const controller = require('../controllers/integrations');
const validateToken = require('../middleware/auth').validateToken;

module.exports = (router) => {
  /* #swagger.parameters['Authorization'] = { in: 'header', required: true, type: 'string', description: 'Bearer token' } */
  /* #swagger.consumes = ['multipart/form-data'] */
  /* #swagger.parameters['file'] = { in: 'formData', required: true, type: 'file' } */
  router.post('/v2/integrations/supplier-orders/import', validateToken, controller.importSupplierOrders);

  /* #swagger.parameters['Authorization'] = { in: 'header', required: true, type: 'string', description: 'Bearer token' } */
  router.get('/v2/reports/monthly', validateToken, controller.readMonthlyReport);

  router.get('/v2/reports/activity', validateToken, (req, res) => {
    /* #swagger.security = [{ bearerAuth: [] }] */
    /* #swagger.parameters['limit'] = { in: 'query', required: false, '@schema': { type: 'integer', minimum: 1, maximum: 5000, default: 20 }, description: 'Number of synthetic activity records' } */
    return controller.readActivityReport(req, res);
  });

  /* #swagger.parameters['Authorization'] = { in: 'header', required: true, type: 'string', description: 'Bearer token' } */
  /* #swagger.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, weeklyDigest: { type: 'boolean' }, admin: { type: 'boolean' } } } } } } */
  router.put('/v2/users/notification-preferences', validateToken, controller.updateNotificationPreferences);
};
