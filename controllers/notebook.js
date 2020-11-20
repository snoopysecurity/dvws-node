const mongoose = require('mongoose');

const Note = require('../models/notebook');
const jwt = require('jsonwebtoken')
const { exec } = require('child_process');
const connUri = process.env.MONGO_LOCAL_CONN_URL;
var MongoClient = require('mongodb').MongoClient;
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


module.exports = {
  list_all_notes: (req, res) => {
    res = set_cors(req, res)
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    mongoose.connect(connUri, { useNewUrlParser: true, useUnifiedTopology: true }, (err) => {
      if (!err) {
        let result = {}
        const token = req.headers.authorization.split(' ')[1]; 
        const options = {
          expiresIn: '2d',
          issuer: 'https://github.com/snoopysecurity',
        };
        result = jwt.verify(token, process.env.JWT_SECRET, options);
        Note.find({ user: result.user }, { __v: 0 }, function (err, someValue) {
          if (err) res.json(err);
          res.send(someValue);
        });
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
  create_a_note: (req, res) => {
    res = set_cors(req, res)
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    mongoose.connect(connUri, { useNewUrlParser: true, useUnifiedTopology: true }, (err) => {
      if (!err) {
        let result = {}
        const token = req.headers.authorization.split(' ')[1]; // Bearer <token>
        const options = {
          expiresIn: '2d',
          issuer: 'https://github.com/snoopysecurity',
        };
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

      }
    });
  },
  read_a_note: (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    mongoose.connect(connUri, { useNewUrlParser: true, useUnifiedTopology: true }, (err) => {
      if (!err) {

        Note.findById(req.params.noteId, function (err, note) {
          if (err)
            res.send(err);
          res.json(note);
        });
      }
    });
  },

  update_a_note: (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    mongoose.connect(connUri, { useNewUrlParser: true, useUnifiedTopology: true }, (err) => {
      if (!err) {
        Note.findOneAndUpdate({ _id: req.params.noteId }, req.body, { new: true }, function (err, note) {
          if (err)
            res.send(err);
          res.json(note);
        });
      }

    });
  },

  delete_a_note: (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    mongoose.connect(connUri, { useNewUrlParser: true, useUnifiedTopology: true }, (err) => {
      if (!err) {
        Note.remove({
          _id: req.params.noteId
        }, function (err, note) {
          if (err)
            res.send(err);
          res.json({ message: 'Note successfully deleted' });
        });
      }
    });

  },


  //old developer code, should be rewritten to use mongoose ORM but cba

  search_note: (req, res) => {
    res = set_cors(req, res)
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    connUri2 = connUri.substr(0, connUri.lastIndexOf("/"));

    MongoClient.connect(connUri2, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
      if (!err) {

        const db = client.db('node-dvws')
        const collection = db.collection('notes')
        var search_name = req.body.search
        var type = 'public' //only display public notes
        var query = { $where: `this.type == '${type}' && this.name == '${search_name}'` };
        collection.find(query).toArray((err, items) => {
          res.send(items);
        })
      }


    });

  }
}

