require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const swaggerUI = require('swagger-ui-express');
const swaggerGen = require('../scripts/generate-openapi');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { attachNotificationWebSocket } = require('./services/websocket-notifications');
const rateLimiter = require('./middleware/rate-limiter');

const soapservice = require('./services/soap/user-service'); //SOAP Service
const rpcserver = require('./services/xml-rpc/server'); //XMLRPC Service

const { ApolloServer } = require('apollo-server-express');
const { GqSchema } = require('./graphql/schema');
const User = require('./models/user');


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

// The API gateway counts HTTP requests to GraphQL, including a batched request
// containing many login mutations, as one attempt against this request budget.
app.post('/graphql', rateLimiter({ windowMs: 30 * 1000, max: 10 }));

// Intentionally undisclosed TRACE diagnostics endpoint for the route discovery
// challenge. It returns synthetic account metadata, never process secrets.
app.trace('/internal/diagnostics', async (req, res) => {
  try {
    const users = await User.find({}, 'username email admin').lean();
    res.json({
      service: 'DVWS customer accounts',
      build: '2026.09-training',
      databaseState: require('mongoose').connection.readyState,
      accounts: users
    });
  } catch (err) {
    res.status(500).json({ error: 'Diagnostics unavailable' });
  }
});

// SPA fallback: serve index.html for any route that doesn't match
// an API endpoint or static file, so client-side routing works on refresh
app.get('*', (req, res, next) => {
  // Skip API routes, swagger, SOAP, RPC, and GraphQL paths
  if (req.path.startsWith('/api') || req.path === '/openAPI-spec.json' || req.path.startsWith('/dvwsuserservice') || req.path.startsWith('/api-docs') || req.path.startsWith('/xmlrpc') || req.path.startsWith('/graphql')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
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
  const swaggerOutput = require('../docs/openapi/openapi.json');

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
    const hostname = process.env.DVWS_HOST || 'dvws.local';
    const host = `http://${hostname}${port == 80 ? "" : ":" + port}`;
    console.log(`🚀 All services listening at ${host} (127.0.0.1)`);
    console.log(`  ├─ REST API:  ${host}/api`);
    console.log(`  ├─ SOAP:      ${host}/dvwsuserservice`);
    console.log(`  ├─ XML-RPC:   ${host}/xmlrpc`);
    console.log(`  ├─ GraphQL:   ${host}/graphql`);
    console.log(`  └─ API Docs:  ${host}/api-docs`);
  });
  attachNotificationWebSocket(serverInstance);

  if (process.env.HTTPS_PORT && process.env.TLS_CERT_PATH && process.env.TLS_KEY_PATH) {
    const tlsOptions = {
      cert: fs.readFileSync(process.env.TLS_CERT_PATH),
      key: fs.readFileSync(process.env.TLS_KEY_PATH)
    };
    const httpsServer = https.createServer(tlsOptions, app);
    attachNotificationWebSocket(httpsServer);
    httpsServer.listen(process.env.HTTPS_PORT, '0.0.0.0', () => {
      console.log(`🔒 Optional HTTPS lab listening on https://${process.env.DVWS_HOST || 'dvws.local'}:${process.env.HTTPS_PORT}`);
    });
  }
}).catch(err => {
  console.error("Unable to generate Swagger documentation", err);
  process.exit(1);
});

module.exports = app;
