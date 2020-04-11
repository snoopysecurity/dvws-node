

const jwt = require('jsonwebtoken');

const sql = require('../models/passphrase');


module.exports = {
  save: (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    if (req.body.passphrase === '' || req.body.reminder === '' ) {
      res.send('Passphrase or Reminder Empty');
    } else {
      let result = {}
      const token = req.headers.authorization.split(' ')[1]; // Bearer <token>
      const options = {
      expiresIn: '2d',
      issuer: 'https://github.com/snoopysecurity',
    };
    result = jwt.verify(token, process.env.JWT_SECRET, options);
    sql.query("CREATE TABLE IF NOT EXISTS `passphrases` (`username` varchar(200) NOT NULL,`passphrase` varchar(200) NOT NULL,`reminder` varchar(200) NOT NULL,`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP)")
      
    var save_query = "INSERT INTO passphrases (username,passphrase,reminder) values ('" + result.user + "','" + req.body.passphrase + "','" + req.body.reminder + "')"
    sql.query(save_query, function (err, result) {
      if (err) {
        res.status(500);
        res.send(err);
        
      } else {
      res.send('Passphrase Saved Successfully');
    }
    });
  }
  },

  get: (req, res) => {
    console.log(req.params.username);
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      sql.query("select passphrase,reminder from passphrases WHERE username = '" + req.params.username + "'", function (err, result) {
        if (err) {
          res.send(err);
        } else {
        res.send(result);   
      } 
      });
    
      //connection.end();
      //connection.end();
  } 


};


  



