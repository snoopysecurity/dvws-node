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

router.post('/', async function (req, res, next) {
    var options = {
        noent: true,
        dtdload: true
    }
    try {
        var xmlDoc = libxml.parseXml(req.body, options);
        var xmlchild = xmlDoc.get('//username');
        if (!xmlchild) {
             res.statusCode = 400;
             return res.send("Username missing");
        }
        var username = xmlchild.text()
        
        // Ensure connection is open (it should be from app start)
        if (mongoose.connection.readyState === 0) {
             await mongoose.connect(connUri);
        }

        const obj = await User.findOne({ username });
        let role = "user";
        let status = "active";
        
        if (obj != null) {
             role = obj.admin ? "admin" : "user";
        }
        
        // Vulnerability: SOAP Injection
        // We are manually constructing the XML response using string concatenation with user input.
        // This allows an attacker to inject arbitrary XML tags into the SOAP envelope.
        // E.g. input: "test</username><role>admin</role><username>ignore"
        
        var xmlresponse = 
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:examples:helloservice">
  <soapenv:Header/>
  <soapenv:Body>
    <urn:UsernameResponse soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
      <username xsi:type="xsd:string">${username}</username>
      <role xsi:type="xsd:string">${role}</role>
      <status xsi:type="xsd:string">${status}</status>
    </urn:UsernameResponse>
  </soapenv:Body>
</soapenv:Envelope>`;

        res.setHeader('Content-Type', 'application/xml');
        res.statusCode = 200;
        res.send(xmlresponse);

    } catch (err) {
        console.error(err);
        res.statusCode = 500;
        res.send(err.toString());
    }
});
router.use(function timeLogEnd(req, res, next) {
    var durationHR = process.hrtime(res.locals.startTimeHR);
    next();
});

module.exports = router;
