var mysql = require('mysql');


const connHost = process.env.SQL_LOCAL_CONN_URL;
const connUser = process.env.SQL_username;
const connPass = process.env.SQL_password;
const connDB = process.env.SQL_DB_NAME;



var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'mysecretpassword'
});


connection.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
  connection.query("CREATE DATABASE dvws_sqldb", function (err, result) {
    connection.end()
    if (err) throw err;
    console.log("SQL Database created");
    
});
});


