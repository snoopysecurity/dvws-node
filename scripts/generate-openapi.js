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
  redeem.description = 'Redeem an active promotion once per account. Private campaign prefix matches take a slower lookup path.';
  redeem.security = [{ bearerAuth: [] }];
  redeem.requestBody = { required: true, content: { 'application/json': { schema: {
    type: 'object', required: ['code'], properties: { code: { type: 'string', maxLength: 100 } }
  } } } };
  redeem.responses = {
    200: { description: 'Credits applied. A private campaign redemption also returns an account-specific flag.', content: { 'application/json': { schema: {
      type: 'object', required: ['balance', 'credits', 'redemption'], properties: {
        balance: { type: 'number' }, credits: { type: 'number' }, redemption: { type: 'object' }, flag: { type: 'string' }
      }
    } } } },
    400: { description: 'Missing or invalid code' }, 401: { description: 'Unauthorized' },
    404: { description: 'Promotion not found' }, 409: { description: 'Promotion already redeemed' },
    500: { description: 'Unable to redeem promotion' }
  };

  const timing = spec.paths['/v2/resource-store/promotions/timing/validate'].post;
  timing.description = 'Validate an account-specific flag after that account redeems the private campaign.';
  timing.security = [{ bearerAuth: [] }];
  timing.requestBody = { required: true, content: { 'application/json': { schema: {
    type: 'object', required: ['flag'], properties: { flag: { type: 'string', minLength: 1, maxLength: 100 } }
  } } } };
  timing.responses = {
    200: { description: 'Validation result for the authenticated account', content: { 'application/json': { schema: {
      type: 'object', required: ['valid'], properties: { valid: { type: 'boolean' } }
    } } } },
    400: { description: 'Missing or invalid flag' }, 401: { description: 'Unauthorized' },
    500: { description: 'Unable to validate flag' }
  };

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
