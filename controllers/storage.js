const jwt = require('jsonwebtoken');
const url = require('url');
const fs = require('fs');
const http = require('http');

module.exports = {
    post: (req, res) => {

        let sampleFile;
        let uploadPath;

        let result = {}

        const token = req.headers.authorization.split(' ')[1]; // Bearer <token>
        const options = {
            expiresIn: '2d',
            issuer: 'https://github.com/snoopysecurity',
        };
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
            sampleFile.name = 'undefined';
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
        const options = {
            expiresIn: '2d',
            issuer: 'https://github.com/snoopysecurity',
        };
        result = jwt.verify(token, process.env.JWT_SECRET, options);


        uploadPath = __dirname + '/../public/uploads/' + "/" + result.user;
        var resultData = [];

        fs.readdir(uploadPath, function (err, files) {
            if (err) {
                res.json('No files Uploaded ' + err);
            }
            files.forEach(function (file) {
                resultData.push("http://dvws.local/uploads/" + result.user + "/" + file);
                
            });
            res.json(resultData);
        });


    }
};

