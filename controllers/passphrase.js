

const jwt = require('jsonwebtoken');
var serialize = require("node-serialize")
const PDFDocument = require('pdfkit');
const fs = require('fs');
const bcrypt = require('bcrypt');
const User = require('../models/users');

const sequelize = require('../models/passphrase');

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
    save: async (req, res) => {
      res = set_cors(req, res);
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      if (req.body.passphrase === '' || req.body.reminder === '') {
        res.send('Passphrase or Reminder Empty');
      } else {
        let result = {};
        const token = req.headers.authorization.split(' ')[1];
        result = jwt.verify(token, process.env.JWT_SECRET, options);
        try {
          await sequelize.query(
            'CREATE TABLE IF NOT EXISTS `passphrases` (`username` varchar(200) NOT NULL, `passphrase` varchar(200) NOT NULL, `reminder` varchar(200) NOT NULL, `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP)'
          );
          const saveQuery = `INSERT INTO passphrases (username, passphrase, reminder) values ('${result.user}', '${req.body.passphrase}', '${req.body.reminder}')`;
          await sequelize.query(saveQuery);
          res.send('Passphrase Saved Successfully');
        } catch (err) {
          res.status(500);
          res.send(err);
        }
      }
    },
  
    get: async (req, res) => {
      res = set_cors(req, res);
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      try {
        const result = await sequelize.query(
          `SELECT passphrase, reminder FROM passphrases WHERE username = '${req.params.username}'`
        );
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.write(JSON.stringify(result[0]));
        res.end();
      } catch (err) {
        res.send(err);
      }
    },


    export: async (req, res) => {
      res = set_cors(req, res);
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      let result = {};
      const token = req.headers.authorization.split(' ')[1];
      result = jwt.verify(token, process.env.JWT_SECRET, options);

      // Verify credentials before export (Vulnerable: No Rate Limiting + User enumeration)
      const { password, username } = req.body;
      if (!password || !username) {
          return res.status(400).send("Username and Password required");
      }

      try {
          // Vulnerability: Uses username from body allowing brute force of any user
          const user = await User.findOne({ username: username });
          if (!user || !(await bcrypt.compare(password, user.password))) {
              return res.status(401).send("Incorrect credentials");
          }
      } catch (err) {
          return res.status(500).send(err.message);
      }

      const payload = Buffer.from(req.body.data, 'base64');
      const data = serialize.unserialize(payload.toString());
  
      if (data) {
        const myDoc = new PDFDocument({ bufferPages: true });
        let buffers = [];
        myDoc.on('data', buffers.push.bind(buffers));
        myDoc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          res.writeHead(200, {
            'Content-Length': Buffer.byteLength(pdfData),
            'Content-Type': 'application/pdf',
            'Content-disposition': 'attachment;filename=test.pdf',
          });
          res.end(pdfData);
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
