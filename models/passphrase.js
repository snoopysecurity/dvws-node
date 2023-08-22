const Sequelize = require('sequelize');
require('dotenv').config();

const connHost = process.env.SQL_LOCAL_CONN_URL;
const connUser = process.env.SQL_USERNAME;
const connPass = process.env.SQL_PASSWORD;
const connDB = process.env.SQL_DB_NAME;

const sequelize = new Sequelize(connDB, connUser, connPass, {
  host: connHost,
  dialect: 'mysql'
});

sequelize
  .authenticate()
  .then(() => {
    console.log('[+] Connection to MySQL database established successfully.');
  })
  .catch(err => {
    console.error('[-] Unable to connect to the database:', err);
    process.exit(1);
  });

module.exports = sequelize;
