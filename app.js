require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const swaggerUI = require('swagger-ui-express');
const swaggerGen = require('./swagger-generator');
const fileUpload = require('express-fileupload');
const path = require('path');

// const swaggerDocument = require('./swagger'); //Swagger - Replaced by swagger-autogen
const soapservice = require('./soapserver/dvwsuserservice'); //SOAP Service
const rpcserver = require('./rpc_server'); //XMLRPC Sever

const { ApolloServer } = require('apollo-server');
const {  GqSchema } =  require('./graphql/schema');


const app = express();
const router = express.Router();



const routes = require('./routes/index.js');

app.use(express.static('public'));
app.use("/css", express.static(path.join(__dirname, "node_modules/bootstrap/dist/css")));
app.use("/js", express.static(path.join(__dirname, "node_modules/bootstrap/dist/js")));
app.use("/js", express.static(path.join(__dirname, "node_modules/jquery/dist")));
app.use("/js", express.static(path.join(__dirname, "node_modules/angular")));

app.use(bodyParser.urlencoded({ extended: true }));

// Swagger generation and setup will be handled before app.listen
// const swaggerOptions = { ... };
// const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/dvwsuserservice', soapservice);
app.use(bodyParser.json());
app.use(fileUpload({ parseNested: true }));

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
app.use('/api', routes(router));


  
swaggerGen().then(() => {
  const swaggerOutput = require('./swagger-output.json');
  
  app.get('/openAPI-spec.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerOutput);
  });

  app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerOutput));

  app.listen(process.env.EXPRESS_JS_PORT, '0.0.0.0', () => {
    console.log(`🚀 API listening at http://dvws.local${process.env.EXPRESS_JS_PORT == 80 ? "" : ":" + process.env.EXPRESS_JS_PORT } (127.0.0.1)`);
  });
});


  // The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({ 
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
  }, });


server.listen({ port: process.env.GRAPHQL_PORT }).then(({ url }) => {
    console.log(`🚀 GraphQL Server ready at ${url}`);
  });;

module.exports = app;
