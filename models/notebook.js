
const mongoose = require('mongoose');
var MongoClient = require('mongodb').MongoClient;

const connUri = process.env.MONGO_LOCAL_CONN_URL;

// schema maps to a collection
const Schema = mongoose.Schema;
const autoIncrement = require('mongoose-auto-increment');

var options = { keepAlive: 1, useNewUrlParser: true, useUnifiedTopology: true };     
//const connection = mongoose.createConnection(connUri, options);
//autoIncrement.initialize(connection);

(async () => {
try {
  var coptions = { keepAlive: 1, useNewUrlParser: true };
  const connection = await mongoose.createConnection(connUri, options);
  autoIncrement.initialize(connection);
  await mongoose.connect(connUri, coptions);
} catch (error) {
  console.log(error);
  process.exit(1);
}
})(); 


// For nodemon restarts
process.once('SIGUSR2', () => {
gracefulShutdown('nodemon restart', () => {
process.kill(process.pid, 'SIGUSR2');
});
});
// For app termination
process.on('SIGINT', () => {
gracefulShutdown('app termination', () => {
process.exit(0);
});
});
// For Heroku app termination
process.on('SIGTERM', () => {
gracefulShutdown('Heroku app shutdown', () => {
process.exit(0);
});
});


// capture app termination / restart events
// To be called when process is restarted or terminated
function gracefulShutdown(msg, cb) {
  mongoose.connection.close(() => {
      console.log(`Mongoose disconnected through ${msg}`);
      cb();
  });
  }


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