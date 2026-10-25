const swaggerAutogen = require('swagger-autogen')({openapi: '3.0.0'});
const fs = require('fs');

const doc = {
  info: {
    title: 'DVWS API',
    description: 'API Used for DVWS Application',
    version: '0.1'
  },
  servers: [
    {
      url: `http://${process.env.DVWS_HOST || 'dvws.local'}/api`
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    }
  },
};

const outputFile = './docs/openapi/openapi.json';
const endpointsFiles = ['./src/routes/users.js', './src/routes/notes.js', './src/routes/passphrase.js', './src/routes/files.js', './src/routes/integrations.js', './src/routes/resource-store.js'];

module.exports = async () => {
  await swaggerAutogen(outputFile, endpointsFiles, doc);
  const spec = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  const post = spec.paths['/v2/resource-store/orders'].post;
  const orderSchema = {
    type: 'object',
    required: ['itemId', 'quantity'],
    properties: {
      itemId: { type: 'string', enum: ['api-monitor', 'build-runner', 'log-retention'] },
      quantity: { type: 'integer', minimum: -1000, maximum: 1000, not: { enum: [0] }, description: 'Negative values increase the caller\'s credits.' }
    }
  };
  const bodyParameter = post.parameters.find((parameter) => parameter.name === 'body');
  if (bodyParameter) bodyParameter.schema = orderSchema;
  post.requestBody.content['application/json'].schema = orderSchema;

  spec.paths['/v2/release/{release}'].get.description =
    'Look up the current release in the operational XML configuration. The release value is interpolated into XPath.';
  const redeem = spec.paths['/v2/resource-store/promotions/redeem'].post;
  redeem.description = 'Redeem an active promotion from the operational XML configuration once per account.';
  redeem.security = [{ bearerAuth: [] }];
  redeem.requestBody = { required: true, content: { 'application/json': { schema: {
    type: 'object', required: ['code'], properties: { code: { type: 'string', maxLength: 100 } }
  } } } };

  const bio = spec.paths['/v2/users/profile/bio'].put;
  bio.description = 'Save the authenticated account\'s bio before exporting it.';
  bio.security = [{ bearerAuth: [] }];
  bio.requestBody = { required: true, content: { 'application/json': { schema: {
    type: 'object', required: ['bio'], properties: { bio: { type: 'string', maxLength: 2000 } }
  } } } };

  const exportXml = spec.paths['/v2/users/profile/export/xml'].post;
  exportXml.description = 'Export the authenticated account\'s stored profile as signed XML. The signature is returned in X-Profile-Export-Signature.';
  exportXml.security = [{ bearerAuth: [] }];
  delete exportXml.requestBody;

  const restoreXml = spec.paths['/v2/users/profile/restore/xml'].post;
  restoreXml.description = 'Restore a signed XML profile export to the authenticated account.';
  restoreXml.security = [{ bearerAuth: [] }];
  restoreXml.requestBody = { required: true, content: { 'application/json': { schema: {
    type: 'object', required: ['xml', 'signature'], properties: {
      xml: { type: 'string' }, signature: { type: 'string' }
    }
  } } } };
  fs.writeFileSync(outputFile, `${JSON.stringify(spec, null, 2)}\n`);
};
