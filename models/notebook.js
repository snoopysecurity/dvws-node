
const mongoose = require('mongoose');
var connection = require('./db');

// schema maps to a collection
const Schema = mongoose.Schema;

const mongooseSuperIncrement = require('mongoose-super-increment');

mongooseSuperIncrement.initialize(connection);

const NoteSchema = new Schema({
  name: {
    type: String,
    required: 'Kindly enter the name of the Note'
  },
  body: {
    type: String,
    required: 'Kindly enter some notes you would like to store'
  },
  created_date: {
    type: Date,
    default: Date.now
  },
  type: {
    type: [{
      type: String,
      enum: ['note', 'reminder', 'list', 'secret', 'public']
    }],
    default: ['public']
  },
  user: {
    type: String
  }
});




NoteSchema.plugin(mongooseSuperIncrement.plugin, { model: 'Notes' });
module.exports = mongoose.model('Notes', NoteSchema);