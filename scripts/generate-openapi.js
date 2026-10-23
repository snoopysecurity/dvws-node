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
      url: 'http://dvws.local/api'
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
  fs.writeFileSync(outputFile, `${JSON.stringify(spec, null, 2)}\n`);
};
