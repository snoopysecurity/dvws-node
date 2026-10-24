const validateToken = require('../middleware/auth').validateToken;
const Wallet = require('../models/resource-store-wallet');
const Order = require('../models/resource-store-order');
const { invalidateMonthlyReport } = require('../services/monthly-report-cache');
const { recordActivity } = require('../services/activity-events');
const { findActivePromotion } = require('../services/operational-config');

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
      return res.json({ balance: wallet.balance, catalogue, orders, redemptions: wallet.redemptions || [] });
    } catch (error) {
      return res.status(500).json({ error: 'Unable to load resource store.' });
    }
  });

  router.post('/v2/resource-store/promotions/redeem', validateToken, async (req, res) => {
    // #swagger.tags = ['Resource Store']
    // #swagger.summary = 'Redeem an active promotion code for workspace credits'
    // #swagger.security = [{ bearerAuth: [] }]
    const code = req.body?.code;
    if (typeof code !== 'string' || !code.trim() || code.length > 100) {
      return res.status(400).json({ error: 'A promotion code is required.' });
    }
    const promotion = findActivePromotion(code.trim());
    if (!promotion) return res.status(404).json({ error: 'Promotion code not found.' });
    const username = req.decoded.user;
    if (!username) return res.status(401).json({ error: 'Authentication error. Invalid token.' });
    try {
      const wallet = await getWallet(username);
      const updatedWallet = await Wallet.findOneAndUpdate(
        { _id: wallet._id, 'redemptions.code': { $ne: promotion.code } },
        {
          $inc: { balance: promotion.credits },
          $push: { redemptions: { code: promotion.code, credits: promotion.credits, redeemedAt: new Date() } }
        },
        { new: true }
      );
      if (!updatedWallet) return res.status(409).json({ error: 'Promotion already redeemed.' });
      await recordActivity(username, 'promotion.redeemed', promotion.code);
      return res.json({ balance: updatedWallet.balance, credits: promotion.credits,
        redemption: updatedWallet.redemptions.at(-1) });
    } catch (error) {
      return res.status(500).json({ error: 'Unable to redeem promotion.' });
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
      await invalidateMonthlyReport(username);
      await recordActivity(username, 'resource_order.created', order._id.toString());
      return res.status(201).json({ order, balance: updatedWallet.balance });
    } catch (error) {
      return res.status(500).json({ error: 'Unable to place order.' });
    }
  });
};
