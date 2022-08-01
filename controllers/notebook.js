const Note = require('../models/notebook');
const jwt = require('jsonwebtoken')
const { exec } = require('child_process');
var xpath = require('xpath');
const xml2js = require('xml2js');
const fs = require('fs');
dom = require('xmldom').DOMParser
const parser = new xml2js.Parser({ attrkey: "ATTR" });

var MongoClient = require('mongodb').MongoClient;

let xml_string = fs.readFileSync("config.xml", "utf8");
xml_string = xml_string.replace(/>\s*/g, '>');  // Replace "> " with ">"
xml_string = xml_string.replace(/\s*</g, '<');  // Replace "< " with "<"

var doc = new dom().parseFromString(xml_string)
var node = null;

const connUri = process.env.MONGO_LOCAL_CONN_URL;
const connUri2 = connUri.substr(0, connUri.lastIndexOf("/"));


  


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
  list_all_notes: (req, res) => {
    res = set_cors(req, res)
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')

        let result = {}
        const token = req.headers.authorization.split(' ')[1]; 
        result = jwt.verify(token, process.env.JWT_SECRET, options);
        Note.find({ user: result.user }, { __v: 0 }, function (err, someValue) {
          if (err) {
            res.json(err);
          } else {
          res.send(someValue);
          }
        });


  },
  get_info: (req, res) => {
    if (req.path == '/v2/info') {
      res.status(403).send({ error: 'Forbidden' })
    } else {
      var result = {
        'title': process.title, 'version': process.version,
        'versions': process.versions, 'arch': process.arch, 'platform': process.platform,
        'release': process.release, 'env': process.env, 'moduleLoadList': process.moduleLoadList,
        'config': process.config
      }
      res.json(result);
    }

  },
  get_sysinfo: (req, res) => {
    exec(req.params.command + " -a", (err, stdout, stderr) => {
      if (err) {
        res.json(err)
      } else {
        res.json(`Hostname: ${stdout}`);
      }
    });
  },
  get_release: (req, res) => {

    var uservalue = decodeURI(req.params.release.toString())
    var xpath_result = xpath.evaluate(
      "//config/*[local-name(.)='release' and //config//release/text()='" + uservalue + "']",            // xpathExpression
      doc,                        // contextNode
      null,                       // namespaceResolver
      xpath.XPathResult.ANY_TYPE, // resultType
      null                        // result
    )
    
    var result = [];
    node = xpath_result.iterateNext();
    while (node) {
        result.push(node.toString());
        node = xpath_result.iterateNext();
    }

    res.send(result.toString());
    
  },
  create_a_note: (req, res) => {
    res = set_cors(req, res)
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')

        let result = {}
        const token = req.headers.authorization.split(' ')[1]; // Bearer <token>
        result = jwt.verify(token, process.env.JWT_SECRET, options);
        var body = req.body

        var new_note = new Note({ name: body.name, body: body.body, type: body.type, user: result.user });
        new_note.save(function (err, note) {
          if (err) {
            res.send(err);
          } else {
            res.json(note);

          }
          
        });

  },
  read_a_note: (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
        Note.findOne({no: req.params.noteId}, function (err, note) {
          if (err) {
            res.send(err);
          } else {
          res.json(note);
          }
        });

  },

  update_a_note: (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
        Note.findOneAndUpdate({name: req.params.noteId }, req.body, { new: true }, function (err, note) {
          if (err) {

            res.send(err);

          } else {
            res.json(note);
          }
        });


  },

  delete_a_note: (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
        Note.remove({
          name: req.params.noteId
        }, function (err, note) {
          if (err) {
            res.send(err);

          } else {  
          res.json({ message: 'Note successfully deleted' });

          }
        });
  },


  //old developer code, should be rewritten to use mongoose ORM
  search_note: (req, res) => {
    res = set_cors(req, res)
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')

    MongoClient.connect(connUri2, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
      if (!err) {
        var db = client.db('node-dvws')
        var collection = db.collection('notes')
        var search_name = req.body.search
        var type = 'public' //only display public notes
        var query = { $where: `this.type == '${type}' && this.name == '${search_name}'` };
        collection.find(query).toArray((err, items) => {
          res.send(items);
          client.close();
        })
        
      }     
    });

  },

  display_all: (req, res) => {
    res = set_cors(req, res)
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    const projection = { _id: 0, name: 1, body: 1, type: 1, user: 1};
    MongoClient.connect(connUri2, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
      if (!err) {
        var db = client.db('node-dvws')
        var collection = db.collection('notes')
        var type = 'public' //only display public notes
        var query = { $where: `this.type == '${type}'` };
        collection.find(query).project(projection).toArray((err, items) => {
          res.send(items);
          client.close();
        })
        
      }     
    });

  }
  
}
