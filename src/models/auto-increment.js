const mongoose = require('mongoose');

let Counter;

const initialize = (connection) => {
  if (Counter) return;
  
  const CounterSchema = new mongoose.Schema({
    model: { type: String, require: true, unique: true },
    seq: { type: Number, default: 0 }
  });
  
  // Use the provided connection or default
  // Note: if connection is a Connection instance, use connection.model
  // If it's the mongoose object, use mongoose.model
  const db = connection || mongoose;
  Counter = db.model('IdentityCounter', CounterSchema);
}

const plugin = (schema, options) => {
  const modelName = options.model;
  const field = options.field || '_id'; // Default to _id if not specified

  // If overriding _id, we need to make sure the schema knows it's a Number
  if (field === '_id') {
      // In Mongoose, simply setting _id in schema definition works best, 
      // but here we are in a plugin. 
      // We can add the path if it doesn't exist?
      // Or relies on the fact that we can set _id to whatever we want before save?
      // Mongoose might auto-generate ObjectId if we don't handle this.
      
      // For now, let's assume we just overwrite it in pre-save.
      // However, to prevent casting errors, the schema should ideally expect the type.
      // But we can't change schema definition easily in plugin after instantiation?
      // Actually we can: schema.add({ _id: Number })
      // But _id is special.
      
      // Let's check if we can add it.
      // schema.add({ _id: Number }); // This might throw if _id already exists
  }

  schema.pre('save', function(next) {
    const doc = this;
    if (!doc.isNew) return next();
    
    if (!Counter) {
        return next(new Error("AutoIncrement plugin not initialized"));
    }

    Counter.findOneAndUpdate(
      { model: modelName },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    ).then((counter) => {
      doc[field] = counter.seq;
      next();
    }).catch(next);
  });
};

module.exports = { initialize, plugin };
