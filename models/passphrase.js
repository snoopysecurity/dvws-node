
'user strict';

var mysql = require('mysql');

const environment = process.env.NODE_ENV;
const connHost = process.env.SQL_LOCAL_CONN_URL;
const connUser = process.env.SQL_username;
const connPass = process.env.SQL_password;
const connDB = process.env.SQL_DB_NAME;
console.log(connHost)

var connection = mysql.createConnection({
    host     : connHost,
    user     : connUser,
    password : connPass,
    database : connDB
  });



  connection.connect(function(err) {
    if (err) throw err;
});

module.exports = connection;