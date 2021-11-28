

const mongoose = require('mongoose');

const connUri = process.env.MONGO_LOCAL_CONN_URL;




var options = { keepAlive: 1, useNewUrlParser: true, useUnifiedTopology: true };     
const connection = mongoose.createConnection(connUri, options);
try {
    mongoose.connect(connUri, options);
    mongoose.connection.once('open', ()=>{
    console.log("Connected to MongoDB")
    })
  } catch (error) {
    console.log(error);
    process.exit(1);
  }


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

  
module.exports = connection; 