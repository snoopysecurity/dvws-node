var express = require('express');
var Builder = require('xml2js').Builder;
var fs = require("fs");
const libxml = require('libxmljs');
var bodyParser = require('body-parser');
var router = express.Router();

const mongoose = require('mongoose');
const connUri = process.env.MONGO_LOCAL_CONN_URL;
const User = require('../models/users');

const path = require("path");
const servicewsdl = fs.readFileSync(path.resolve(__dirname, "dvwsuserservice.wsdl"));


router.use(bodyParser.text({ type: '*/*' }));
router.use(function timeLogStart(req, res, next) {
    res.locals.startTimeHR = process.hrtime();
    next();
});


router.get('/', function (req, res, next) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')

    if (req.query.wsdl === "") {
        res.setHeader('Content-Type', 'application/xml');
        res.statusCode = 200;

        fs.readFile(servicewsdl, "utf8", function (err, data) {
            if (err) {
                res.setHeader('Content-Type', 'application/xml');
                res.statusCode = 200;
                res.send(err.path);
            } else {
                res.setHeader('Content-Type', 'application/xml');
                res.statusCode = 200;
                res.send(err.path);
            }
        });
    } else {
        res.send("Invalid GET request");
    }

});

router.post('/', function (req, res, next) {
    var options = {
        noent: true,
        dtdload: true
    }
    var xmlDoc = libxml.parseXml(req.body, options);
    var xmlchild = xmlDoc.get('//username');
    var username = xmlchild.text()
    mongoose.connect(connUri, { useNewUrlParser: true, useUnifiedTopology: true }, (err) => {
        User.findOne({ username }, function (err, obj) {
            if (obj != null) {
                result = "User Exists:" + xmlchild.text()
                jsonresponse = {
                    "soapenv:Envelope": {
                        "$": {
                            "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
                            "xmlns:xsd": "http://www.w3.org/2001/XMLSchema",
                            "xmlns:soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
                            "xmlns:urn": "urn:examples:helloservice"
                        },
                        "soapenv:Header": [""],
                        "soapenv:Body": [{
                            "urn:UsernameResponse": [{
                                "$": {
                                    "soapenv:encodingStyle": "http://schemas.xmlsoap.org/soap/encoding/"
                                },
                                "username": [{
                                    "_": result,
                                    "$": {
                                        "xsi:type": "xsd:string"
                                    }
                                }
                                ]
                            }
                            ]
                        }
                        ]
                    }
                }
                var builder = new Builder();
                var xmlresponse = builder.buildObject(jsonresponse);
                res.setHeader('Content-Type', 'application/xml');
                res.statusCode = 200;
                res.send(xmlresponse);
            } else {
                result = "User Not Found:" + xmlchild.text()
                jsonresponse = {
                    "soapenv:Envelope": {
                        "$": {
                            "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
                            "xmlns:xsd": "http://www.w3.org/2001/XMLSchema",
                            "xmlns:soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
                            "xmlns:urn": "urn:examples:usernameservice"
                        },
                        "soapenv:Header": [""],
                        "soapenv:Body": [{
                            "urn:UsernameResponse": [{
                                "$": {
                                    "soapenv:encodingStyle": "http://schemas.xmlsoap.org/soap/encoding/"
                                },
                                "username": [{
                                    "_": result,
                                    "$": {
                                        "xsi:type": "xsd:string"
                                    }
                                }
                                ]
                            }
                            ]
                        }
                        ]
                    }
                }
                var builder = new Builder();
                var xmlresponse = builder.buildObject(jsonresponse);
                res.setHeader('Content-Type', 'application/xml');
                res.send(xmlresponse);
            }
            mongoose.connection.close();
        });

    });
});
router.use(function timeLogEnd(req, res, next) {
    var durationHR = process.hrtime(res.locals.startTimeHR);
    next();
});

module.exports = router;