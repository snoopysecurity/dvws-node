const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const connUri = process.env.MONGO_LOCAL_CONN_URL;
const environment = process.env.NODE_ENV;
const stage = require('../config')[environment];

// schema maps to a collection
const Schema = mongoose.Schema;
const autoIncrement = require('mongoose-auto-increment');

const connection = mongoose.createConnection(connUri, { useNewUrlParser: true, useUnifiedTopology: true });
autoIncrement.initialize(connection);

const userSchema = new Schema({
  username: {
    type: 'String',
    required: true,
    trim: true,
    unique: true
  },
  password: {
    type: 'String',
    required: true,
    trim: true
  },
  admin: {
    type: Boolean,
    default: false
  }
});



// encrypt password before save
userSchema.pre('save', function (next) {
  const user = this;
  if (!user.isModified || !user.isNew) {
    next();
  } else {
    bcrypt.hash(user.password, stage.saltingRounds, function (err, hash) {
      if (err) {
        console.log('Error hashing password for user', user.username);
        next(err);
      } else {
        user.password = hash;
        next();
      }
    });
  }
});


module.exports = mongoose.model('User', userSchema); // instance of schema