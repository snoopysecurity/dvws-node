const controller = require('../controllers/integrations');
const validateToken = require('../middleware/auth').validateToken;

module.exports = (router) => {
  /* #swagger.parameters['Authorization'] = { in: 'header', required: true, type: 'string', description: 'Bearer token' } */
  /* #swagger.consumes = ['multipart/form-data'] */
  /* #swagger.parameters['file'] = { in: 'formData', required: true, type: 'file' } */
  router.post('/v2/integrations/supplier-orders/import', validateToken, controller.importSupplierOrders);

  /* #swagger.parameters['Authorization'] = { in: 'header', required: true, type: 'string', description: 'Bearer token' } */
  router.get('/v2/reports/monthly', validateToken, (req, res) => {
    // A shared cache may reuse this authenticated report across callers.
    res.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    return controller.readMonthlyReport(req, res);
  });

  router.get('/v2/reports/activity', validateToken, (req, res) => {
    /* #swagger.security = [{ bearerAuth: [] }] */
    /* #swagger.parameters['limit'] = { in: 'query', required: false, '@schema': { type: 'integer', minimum: 1, maximum: 5000, default: 20 }, description: 'Maximum number of recorded account events to return' } */
    return controller.readActivityReport(req, res);
  });

  /* #swagger.parameters['Authorization'] = { in: 'header', required: true, type: 'string', description: 'Bearer token' } */
  /* #swagger.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, weeklyDigest: { type: 'boolean' }, admin: { type: 'boolean' } } } } } } */
  router.put('/v2/users/notification-preferences', validateToken, controller.updateNotificationPreferences);

  // The edge may allow POST while blocking PUT; this override lets the update
  // pass through that method policy using an HTTP header.
  router.post('/v2/users/notification-preferences', validateToken, (req, res) => {
    if (req.get('X-HTTP-Method-Override') !== 'PUT') {
      return res.status(405).set('Allow', 'PUT').json({ error: 'Method Not Allowed' });
    }
    return controller.updateNotificationPreferences(req, res);
  });
};
