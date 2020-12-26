var mysql = require('mysql');
require('dotenv').config();

const mongoose = require('mongoose');

const User = require('./models/users');


const connHost = process.env.SQL_LOCAL_CONN_URL;
const connUser = process.env.SQL_username;
const connPass = process.env.SQL_password;
const connUri = process.env.MONGO_LOCAL_CONN_URL;

var connection = mysql.createConnection({
  host: connHost,
  user: connUser,
  password: connPass
});

console.log('[+] Creating MySQL database for DVWS....');
connection.connect(function (err) {
  if (err) throw err;
  console.log("Connected!");
  connection.query("DROP DATABASE IF EXISTS dvws_sqldb;", function (err, result) {
    if (err) throw err;
    console.log("[+] Old SQL Database deleted");
  });
  connection.query("CREATE DATABASE dvws_sqldb;", function (err, result) {
    if (err) throw err;
    connection.end()
    console.log("[+] SQL Database created");

  });
});

function createAdmin() {
  mongoose.connect(connUri, { useNewUrlParser : true, useUnifiedTopology: true }, (err) => {
  let result = {};



  const user = new User({
    username: "admin",
    password: "letmein",
    admin: true
  });

  user.save((err, user) => {
    if (!err) {
      console.log(user);
    } else {
      result.error = err;
      console.log(result.error);
    }
    // Close the connection after saving

  });

  const user2 = new User({
    username: "test",
    password: "test",
    admin: false
  });

  user2.save((err, user2) => {
    if (!err) {
      console.log(user2);
    } else {
      result.error = err;
      console.log(result.error);
    }
    // Close the connection after saving
    mongoose.disconnect();
  });


});

}


createAdmin()
