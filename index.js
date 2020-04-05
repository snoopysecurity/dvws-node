require('dotenv').config();

const express = require('express');

const logger = require('morgan');
const bodyParser = require('body-parser');
const rpcserver = require('./rpc_server');
const cors = require('cors');
const swaggerUI = require('swagger-ui-express');

const swaggerDocument = require('./swagger');

const app = express();
const router = express.Router();

const environment = process.env.NODE_ENV;
const stage = require('./config')[environment];

const routes = require('./routes/index.js');

app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));
app.use('/api-docs',swaggerUI.serve,swaggerUI.setup(swaggerDocument));
app.use(bodyParser.json());

var corsOptions = {
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

app.use(cors(corsOptions))
app.use(logger('prod'));

app.use('/api', routes(router));

app.listen(`${stage.port}`, () => {
  console.log(`API now listening at :${stage.port}`);
});

module.exports = app;