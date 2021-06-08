const jwt = require('jsonwebtoken');
const url = require('url');
const fs = require('fs');
const http = require('http');


const options = {
  expiresIn: '2d',
  issuer: 'https://github.com/snoopysecurity',
  algorithms: ["HS256", "none"],
  ignoreExpiration: true
};


module.exports = {
  post: (req, res) => {

    let sampleFile;
    let uploadPath;

    let result = {}

    const token = req.headers.authorization.split(' ')[1];
    result = jwt.verify(token, process.env.JWT_SECRET, options);


    if (!req.files.file || Object.keys(req.files.file).length === 0) {
      res.status(400).send('No files were uploaded.');
      return;
    }


    sampleFile = req.files.file;
    uploadPath = __dirname + '/../public/uploads/' + result.user + "/";


    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }

    if (typeof sampleFile.name !== 'undefined') {
      if ( sampleFile.name.endsWith(".xml") == false ) {
        res.status(400).send("Uploaded file is not an XML file.");
        return;
      }
    }

    filePath = __dirname + '/../public/uploads/' + result.user + "/" + sampleFile.name;


    sampleFile.mv(filePath, function (err) {
      if (err) {
        return res.status(500).send(err);
      }
      res.json('File uploaded to your private user directory within ' + __dirname + '/../public/uploads/');
    });

  },

  get: (req, res) => {

    let result = {}
    const token = req.headers.authorization.split(' ')[1]; // Bearer <token>
    result = jwt.verify(token, process.env.JWT_SECRET, options);


    uploadPath = __dirname + '/../public/uploads/' + "/" + result.user;
    var resultData = [];

    fs.readdir(uploadPath, function (err, files) {
      if (err) {
        res.json('No files Uploaded ' + err);
      } else {
        files.forEach(function (file) {
          resultData.push("/uploads/" + result.user + "/" + file);

        });
        res.json(resultData);
      }

    });


  }
};

