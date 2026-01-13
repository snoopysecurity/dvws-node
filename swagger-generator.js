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
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./routes/users.js', './routes/notebook.js', './routes/passphrase.js', './routes/storage.js'];

module.exports = () => swaggerAutogen(outputFile, endpointsFiles, doc);
