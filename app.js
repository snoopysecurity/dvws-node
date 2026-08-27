require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const swaggerUI = require('swagger-ui-express');
const swaggerGen = require('./swagger-generator');
const fileUpload = require('express-fileupload');
const path = require('path');

const soapservice = require('./soapserver/dvwsuserservice'); //SOAP Service
const rpcserver = require('./rpc_server'); //XMLRPC Service

const { ApolloServer } = require('apollo-server-express');
const { GqSchema } = require('./graphql/schema');


const app = express();
const router = express.Router();



const routes = require('./routes/index.js');

app.use(express.static('public'));

app.use(bodyParser.urlencoded({ extended: true }));

const jwt = require('jsonwebtoken')


const options = {
  expiresIn: '2d',
  issuer: 'https://github.com/snoopysecurity',
  algorithms: ["HS256", "none"],
  ignoreExpiration: true
};


var corsOptions = {
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

app.use(cors(corsOptions))

app.use('/dvwsuserservice', soapservice);
app.use('/xmlrpc', rpcserver);
app.use(bodyParser.json());
app.use(fileUpload({ parseNested: true }));
app.use('/api', routes(router));

// SPA fallback: serve index.html for any route that doesn't match
// an API endpoint or static file, so client-side routing works on refresh
app.get('*', (req, res, next) => {
  // Skip API routes, swagger, SOAP, RPC, and GraphQL paths
  if (req.path.startsWith('/api') || req.path.startsWith('/dvwsuserservice') || req.path.startsWith('/api-docs') || req.path.startsWith('/xmlrpc') || req.path.startsWith('/graphql')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const apolloServer = new ApolloServer({
  introspection: true,
  playground: true,
  debug: true,
  allowBatchedHttpRequests: true,
  schema: GqSchema,
  context: async ({ req }) => {
    let verifiedToken = {}
    try {
      const token = req.headers.authorization.split(' ')[1]; // Bearer <token>
      verifiedToken = jwt.verify(token, process.env.JWT_SECRET, options);
    } catch (error) {
      verifiedToken = {}
    }
    return verifiedToken;
  },
});

swaggerGen().then(async () => {
  const swaggerOutput = require('./swagger-output.json');

  app.get('/openAPI-spec.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerOutput);
  });

  app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerOutput));

  // Start Apollo and mount GraphQL middleware on Express
  await apolloServer.start();
  apolloServer.applyMiddleware({ app, path: '/graphql' });

  const serverInstance = app.listen(process.env.EXPRESS_JS_PORT, '0.0.0.0', () => {
    const port = process.env.EXPRESS_JS_PORT;
    const host = `http://dvws.local${port == 80 ? "" : ":" + port}`;
    console.log(`🚀 All services listening at ${host} (127.0.0.1)`);
    console.log(`  ├─ REST API:  ${host}/api`);
    console.log(`  ├─ SOAP:      ${host}/dvwsuserservice`);
    console.log(`  ├─ XML-RPC:   ${host}/xmlrpc`);
    console.log(`  ├─ GraphQL:   ${host}/graphql`);
    console.log(`  └─ API Docs:  ${host}/api-docs`);
  });
}).catch(err => {
  console.error("Unable to generate Swagger documentation", err);
  process.exit(1);
});

module.exports = app;
