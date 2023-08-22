const Sequelize = require('sequelize');
require('dotenv').config();

const mongoose = require('mongoose');

const User = require('./models/users');


const connHost = process.env.SQL_LOCAL_CONN_URL;
const connUser = process.env.SQL_USERNAME;
const connPass = process.env.SQL_PASSWORD;
const connUri = process.env.MONGO_LOCAL_CONN_URL;

const sequelize = new Sequelize('dvws_sqldb', connUser, connPass, {
  host: connHost,
  dialect: 'mysql'
});

console.log('[+] Creating MySQL database for DVWS....');
sequelize.query("DROP DATABASE IF EXISTS dvws_sqldb;")
  .then(() => {
    console.log("[+] Old SQL Database deleted");
    return sequelize.query("CREATE DATABASE dvws_sqldb;");
  })
  .then(() => {
    console.log("[+] SQL Database created");
    sequelize.close();
    createAdmin();
    

  })
  .catch(err => {
    console.error(err);
    sequelize.close();
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

