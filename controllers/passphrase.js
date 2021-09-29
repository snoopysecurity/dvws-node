

const jwt = require('jsonwebtoken');
var serialize = require("node-serialize")
const PDFDocument = require('pdfkit');
const fs = require('fs');

const sql = require('../models/passphrase');

function set_cors(req, res) {
  if (req.get('origin')) {
    res.header('Access-Control-Allow-Origin', req.get('origin'))
    res.header('Access-Control-Allow-Credentials', true)
  } else {
    res.header('Access-Control-Allow-Origin', null)
    res.header('Access-Control-Allow-Credentials', true)
  }
  return res;
};

const options = {
  expiresIn: '2d',
  issuer: 'https://github.com/snoopysecurity',
  algorithms: ["HS256", "none"],
  ignoreExpiration: true
};

module.exports = {
  save: (req, res) => {
    res = set_cors(req, res)
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    if (req.body.passphrase === '' || req.body.reminder === '') {
      res.send('Passphrase or Reminder Empty');
    } else {
      let result = {}
      const token = req.headers.authorization.split(' ')[1];
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
    res = set_cors(req, res)
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    sql.query("select passphrase,reminder from passphrases WHERE username = '" + req.params.username + "'", function (err, result) {
      if (err) {
        res.send(err.code);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.write(JSON.stringify(result));
        res.end();
      }
    });

    //connection.end();
    //connection.end();
  },

  export: (req, res) => {
    res = set_cors(req, res)
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    let result = {}
    const token = req.headers.authorization.split(' ')[1];
    result = jwt.verify(token, process.env.JWT_SECRET, options);
    payload = Buffer.from(req.body.data, "base64");
    var data = serialize.unserialize(payload.toString());

    if (data) {

      var myDoc = new PDFDocument({ bufferPages: true });
      let buffers = [];
      myDoc.on('data', buffers.push.bind(buffers));
      myDoc.on('end', () => {

        let pdfData = Buffer.concat(buffers);
        res.writeHead(200, {
          'Content-Length': Buffer.byteLength(pdfData),
          'Content-Type': 'application/pdf',
          'Content-disposition': 'attachment;filename=test.pdf',
        })
          .end(pdfData);

      });
      myDoc.font('Times-Roman')
      myDoc.fontSize(12)
      myDoc.text('Passphrases for created for user: ' + result.user);
      myDoc.text('--------------------------------------------------');
      try {
      data.forEach(function (passphrases) {
        myDoc.text("Passphrase: " + passphrases.passphrase);
        myDoc.text("Passphrase Reminder: " + passphrases.reminder);
      })
    } catch (e) {
      myDoc.text("Parse Error");
    }
      myDoc.end();
    }

  }


};
