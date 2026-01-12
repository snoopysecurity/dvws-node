const jwt = require('jsonwebtoken');
const url = require('url');
const fs = require('fs');
const http = require('http');
const path = require('path');
const os = require('os');

const options = {
    expiresIn: '2d',
    issuer: 'https://github.com/snoopysecurity',
    algorithms: ["HS256", "none"],
    ignoreExpiration: true
  };

const merge = (target, source) => {
    for (let key in source) {
        if (typeof source[key] === 'object' && source[key] !== null) {
            if (!target[key]) target[key] = {};
            merge(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
};

module.exports = {
    post: (req, res) => {

        let sampleFile;
        let uploadPath;

        let result = {}

        const token = req.headers.authorization.split(' ')[1]; 
        result = jwt.verify(token, process.env.JWT_SECRET, options);

        if (req.body.metadata) {
            try {
                const metadata = JSON.parse(req.body.metadata);
                const fileData = {}; 
                merge(fileData, metadata);
            } catch (e) {
                // ignore
            }
        }

        // Verification for testing
        if (({}).testPollution) {
             delete Object.prototype.testPollution; // Clean up
             return res.status(200).json({ status: "Vulnerable", polluted: true });
        }

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
            res.json('File uploaded to your private user directory');
        });

    },

    fetch: (req, res) => {
        const token = req.headers.authorization.split(' ')[1]; // Bearer <token>
        result = jwt.verify(token, process.env.JWT_SECRET, options);
        var filename = path.resolve(process.cwd() + '/public/uploads/' + result.user + "/" + req.body.filename); 
        res.download(filename);
          
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
                resultData.push(file);
                
            });
            res.json(resultData);
        }
            
        });


    }
};
