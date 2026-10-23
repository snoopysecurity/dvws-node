const validateToken = require('../middleware/auth').validateToken;
const Wallet = require('../models/resource-store-wallet');
const Order = require('../models/resource-store-order');

const catalogue = [
  { id: 'api-monitor', name: 'API Monitor', description: 'Request tracing and endpoint health checks.', price: 10 },
  { id: 'build-runner', name: 'Build Runner', description: 'A burst of hosted build capacity.', price: 25 },
  { id: 'log-retention', name: 'Log Retention', description: 'Extended storage for workspace logs.', price: 50 }
];

async function getWallet(username) {
  try {
    return await Wallet.findOneAndUpdate(
      { username },
      { $setOnInsert: { balance: 100 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (error.code === 11000) return Wallet.findOne({ username });
    throw error;
  }
}

module.exports = (router) => {
  router.get('/v2/resource-store', validateToken, async (req, res) => {
    // #swagger.tags = ['Resource Store']
    // #swagger.summary = 'Read the caller\'s resource store balance, catalogue, and recent orders'
    // #swagger.security = [{ bearerAuth: [] }]
    try {
      const username = req.decoded.user;
      if (!username) return res.status(401).json({ error: 'Authentication error. Invalid token.' });
      const [wallet, orders] = await Promise.all([
        getWallet(username),
        Order.find({ username }).sort({ createdAt: -1 }).limit(20).lean()
      ]);
      return res.json({ balance: wallet.balance, catalogue, orders });
    } catch (error) {
      return res.status(500).json({ error: 'Unable to load resource store.' });
    }
  });

  router.post('/v2/resource-store/orders', validateToken, async (req, res) => {
    // #swagger.tags = ['Resource Store']
    // #swagger.summary = 'Place a resource store order using an item ID and integer quantity'
    // #swagger.security = [{ bearerAuth: [] }]
    // #swagger.parameters['body'] = { in: 'body', required: true, description: 'quantity must be a non-zero integer from -1000 to 1000. Negative quantities increase the caller\'s credits.', schema: { itemId: 'api-monitor', quantity: -100 } }
    const { itemId, quantity } = req.body || {};
    const item = catalogue.find((entry) => entry.id === itemId);
    if (!item) return res.status(400).json({ error: 'Unknown itemId.' });
    if (!Number.isInteger(quantity) || quantity === 0 || quantity < -1000 || quantity > 1000) {
      return res.status(400).json({ error: 'quantity must be a non-zero integer from -1000 to 1000.' });
    }
    const username = req.decoded.user;
    if (!username) return res.status(401).json({ error: 'Authentication error. Invalid token.' });
    try {
      const wallet = await getWallet(username);
      const creditChange = -(item.price * quantity);
      const updatedWallet = await Wallet.findOneAndUpdate(
        { username, _id: wallet._id },
        { $inc: { balance: creditChange } },
        { new: true }
      );
      const order = await Order.create({ username, itemId: item.id, itemName: item.name, unitPrice: item.price, quantity, creditChange });
      return res.status(201).json({ order, balance: updatedWallet.balance });
    } catch (error) {
      return res.status(500).json({ error: 'Unable to place order.' });
    }
  });
};
