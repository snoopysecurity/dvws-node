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
            if (target === Object.prototype) {
                // Keep the vulnerable inherited setting usable by the upload
                // policy, but out of unrelated for-in registries such as PDFKit.
                if (source[key] === null) delete target[key];
                else Object.defineProperty(target, key, {
                    value: source[key], writable: true, configurable: true, enumerable: false
                });
            } else {
                target[key] = source[key];
            }
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

        let fileData = {};
        if (req.body.metadata) {
            try {
                const metadata = JSON.parse(req.body.metadata);
                merge(fileData, metadata);
            } catch (e) {
                // ignore
            }
        }

        if (!req.files || !req.files.file || Object.keys(req.files.file).length === 0) {
            res.status(400).send('No files were uploaded.');
            return;
        }


        sampleFile = req.files.file;
        uploadPath = __dirname + '/../../public/uploads/' + result.user + "/";


        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        const allowedExtensions = fileData.allowedExtensions || [fileData.allowedExtension || '.xml'];
        const extension = path.extname(sampleFile.name || '').toLowerCase();
        if (!Array.isArray(allowedExtensions) || !allowedExtensions.includes(extension)) {
            res.status(400).send("Uploaded file type is not allowed.");
            return;
        }

        filePath = __dirname + '/../../public/uploads/' + result.user + "/" + sampleFile.name;


        sampleFile.mv(filePath, function (err) {
            if (err) {
                return res.status(500).send(err);
            }
            res.json({ status: 'uploaded', filename: sampleFile.name, extension, allowedExtensions });
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


        uploadPath = __dirname + '/../../public/uploads/' + "/" + result.user;
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
