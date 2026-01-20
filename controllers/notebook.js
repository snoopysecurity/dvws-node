const Note = require('../models/notebook');
const jwt = require('jsonwebtoken')
const { exec } = require('child_process');
var xpath = require('xpath');
const xml2js = require('xml2js');
const libxml = require('libxmljs');
const fs = require('fs');
dom = require('@xmldom/xmldom').DOMParser
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
  list_all_notes: async (req, res) => {
    res = set_cors(req, res)
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')

        let result = {}
        const token = req.headers.authorization.split(' ')[1]; 
        result = jwt.verify(token, process.env.JWT_SECRET, options);
        
        try {
            const notes = await Note.find({ user: result.user }, { __v: 0 });
            res.send(notes);
        } catch (err) {
            res.json(err);
        }
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
    try {
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
    } catch (e) {
      res.status(500).send("Error processing request");
    }
  },
  create_a_note: async (req, res) => {
    res = set_cors(req, res)
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')

        let result = {}
        const token = req.headers.authorization.split(' ')[1]; // Bearer <token>
        result = jwt.verify(token, process.env.JWT_SECRET, options);
        var body = req.body

        var new_note = new Note({ name: body.name, body: body.body, type: body.type, user: result.user });
        
        try {
            const note = await new_note.save();
            res.json(note);
        } catch (err) {
            res.send(err);
        }

  },
  read_a_note: async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
        try {
            const note = await Note.findOne({no: req.params.noteId});
            res.json(note);
        } catch (err) {
            res.send(err);
        }
  },

  update_a_note: async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
        try {
            const note = await Note.findOneAndUpdate({name: req.params.noteId }, req.body, { new: true });
            res.json(note);
        } catch (err) {
            res.send(err);
        }
  },

  delete_a_note: async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
        try {
            await Note.deleteOne({ name: req.params.noteId });
            res.json({ message: 'Note successfully deleted' });
        } catch (err) {
            res.send(err);
        }
  },


  //old developer code, should be rewritten to use mongoose ORM
  search_note: async (req, res) => {
    res = set_cors(req, res)
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')

    const client = new MongoClient(connUri2);
    try {
        await client.connect();
        var db = client.db('node-dvws')
        var collection = db.collection('notes')
        var search_name = req.body.search
        var type = 'public' //only display public notes
        // Note: keeping the vulnerability
        var query = { $where: `this.type == '${type}' && this.name == '${search_name}'` };
        
        const items = await collection.find(query).toArray();
        res.send(items);
    } catch (err) {
        // Handle error? original didn't really handle connect error but sent nothing?
        // Original code: if (!err) { ... } else nothing.
        // I should probably send something or nothing.
        res.status(500).send(err);
    } finally {
        await client.close();
    }
  },

  display_all: async (req, res) => {
    res = set_cors(req, res)
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    const projection = { _id: 0, name: 1, body: 1, type: 1, user: 1};
    
    const client = new MongoClient(connUri2);
    try {
        await client.connect();
        var db = client.db('node-dvws')
        var collection = db.collection('notes')
        var type = 'public' //only display public notes
        var query = { $where: `this.type == '${type}'` };
        
        const items = await collection.find(query).project(projection).toArray();
        res.send(items);
    } catch (err) {
         res.status(500).send(err);
    } finally {
        await client.close();
    }
  },

  // Vulnerability: XML Bomb / XXE (Import Notes)
  import_notes_xml: async (req, res) => {
      res = set_cors(req, res);
      
      const xmlData = req.body.xml; 
      if (!xmlData) {
          return res.status(400).send({ error: "XML data required" });
      }

      // Verify token
      let result = {};
      try {
          const token = req.headers.authorization.split(' ')[1]; 
          result = jwt.verify(token, process.env.JWT_SECRET, options);
      } catch (e) {
          return res.status(401).send({ error: "Unauthorized" });
      }
      
      const optionsXml = { 
          noent: true, // VULNERABLE: Enables entity substitution
          dtdload: true,
          huge: true // VULNERABLE: Bypasses parser limits (e.g. max node depth) to facilitate DoS
      };
      
      try {
          const doc = libxml.parseXml(xmlData, optionsXml);
          
          // Parse and save notes
          const notes = doc.find('//note');
          let count = 0;
          
          for (const node of notes) {
              const name = node.get('name') ? node.get('name').text() : ("Imported " + Date.now());
              const body = node.get('body') ? node.get('body').text() : "";
              const type = node.get('type') ? node.get('type').text() : "public";
              
              const newNote = new Note({
                  name: name,
                  body: body,
                  type: type,
                  user: result.user
              });
              await newNote.save();
              count++;
          }

          res.send({ 
              success: true, 
              message: `Successfully imported ${count} notes.`,
              parsedRoot: doc.root().name()
          });
      } catch (e) {
          res.status(500).send(e);
      }
  }
}
