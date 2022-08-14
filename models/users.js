const mongoose = require('mongoose');
const bcrypt = require('bcrypt');


var connection = require('./db');


// schema maps to a collection
const Schema = mongoose.Schema;
const mongooseSuperIncrement = require('mongoose-super-increment');


mongooseSuperIncrement.initialize(connection);

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
    bcrypt.hash(user.password, 10, function (err, hash) {
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