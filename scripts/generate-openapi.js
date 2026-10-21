const swaggerAutogen = require('swagger-autogen')({openapi: '3.0.0'});

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
const endpointsFiles = ['./src/routes/users.js', './src/routes/notes.js', './src/routes/passphrase.js', './src/routes/files.js', './src/routes/integrations.js'];

module.exports = () => swaggerAutogen(outputFile, endpointsFiles, doc);
