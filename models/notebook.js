
const mongoose = require('mongoose');

const connUri = process.env.MONGO_LOCAL_CONN_URL;
// schema maps to a collection
const Schema = mongoose.Schema;
const autoIncrement = require('mongoose-auto-increment');

const connection = mongoose.createConnection(connUri, { useNewUrlParser: true, useUnifiedTopology: true });
autoIncrement.initialize(connection);



const NoteSchema = new Schema({
  name: {
    type: String,
    required: 'Kindly enter the name of the Note'
  },
  body: {
    type: String,
    required: 'Kindly enter some notes you would like to store'
  },
  Created_date: {
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




NoteSchema.plugin(autoIncrement.plugin, 'Notes');
module.exports = mongoose.model('Notes', NoteSchema);