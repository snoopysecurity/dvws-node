require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const swaggerUI = require('swagger-ui-express');
const fileUpload = require('express-fileupload');

const swaggerDocument = require('./swagger'); //Swagger
const soapservice = require('./soapserver/dvwsuserservice'); //SOAP Service
const rpcserver = require('./rpc_server'); //XMLRPC Sever

const { ApolloServer } = require('apollo-server');
const {  GqSchema } =  require('./graphql/schema');


const app = express();
const router = express.Router();

const environment = process.env.NODE_ENV;
const stage = require('./config')[environment];

const routes = require('./routes/index.js');

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument));
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


  
app.listen(`${stage.port}`, () => {
    console.log(`🚀 API listening at :${stage.port}, go to http://dvws.local (127.0.0.1)`);
  });


  // The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({ 
  introspection: true,
  playground: true,
  debug: true,
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


server.listen().then(({ url }) => {
    console.log(`🚀 GraphQL Server ready at ${url}`);
  });;

module.exports = app;