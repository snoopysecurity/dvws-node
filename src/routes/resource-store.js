const crypto = require('crypto');
const validateToken = require('../middleware/auth').validateToken;
const Wallet = require('../models/resource-store-wallet');
const Order = require('../models/resource-store-order');
const Promotion = require('../models/resource-store-promotion');
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

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function timingChallengeFlag(code, username) {
  const digest = crypto.createHash('sha256').update(`${code}\0${username}`).digest('hex').slice(0, 16);
  return `DVWS{promotion_timing_${digest}}`;
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
    const username = req.decoded.user;
    if (!username) return res.status(401).json({ error: 'Authentication error. Invalid token.' });
    try {
      const submittedCode = code.trim();
      let promotion = findActivePromotion(submittedCode);
      let challengeFlag;
      if (!promotion) {
        const normalizedCode = submittedCode.toUpperCase();
        // The legacy campaign lookup searches by prefix before checking
        // eligibility and the complete voucher code. Matching prefixes cause
        // extra database work even when the eventual response is a 404.
        const candidate = await Promotion.findOne({
          code: { $regex: `^${escapeRegex(normalizedCode)}` }, active: true
        }).lean();
        if (candidate) {
          // Intentional timing oracle for the CTF: a matching prefix takes a
          // measurably slower path even when the full code is still wrong.
          await new Promise((resolve) => setTimeout(resolve, 40));
          const previousWallet = await Wallet.findOne({ username }).select('redemptions.code').lean();
          const orderCount = await Order.countDocuments({ username });
          if (candidate.code === normalizedCode && orderCount < candidate.maxOrders) {
            if (previousWallet?.redemptions?.some((entry) => entry.code === candidate.publicId)) {
              return res.status(409).json({ error: 'Promotion already redeemed.' });
            }
            promotion = { code: candidate.publicId, credits: candidate.credits };
            challengeFlag = timingChallengeFlag(candidate.code, username);
          }
        }
      }
      if (!promotion) return res.status(404).json({ error: 'Promotion code not found.' });
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
        redemption: updatedWallet.redemptions.at(-1), ...(challengeFlag ? { flag: challengeFlag } : {}) });
    } catch (error) {
      return res.status(500).json({ error: 'Unable to redeem promotion.' });
    }
  });

  router.post('/v2/resource-store/promotions/timing/validate', validateToken, async (req, res) => {
    // #swagger.tags = ['Resource Store']
    // #swagger.summary = 'Validate the promotion timing challenge flag after redemption'
    // #swagger.security = [{ bearerAuth: [] }]
    const username = req.decoded.user;
    if (!username) return res.status(401).json({ error: 'Authentication error. Invalid token.' });
    const flag = req.body?.flag;
    if (typeof flag !== 'string' || !flag.trim() || flag.length > 100) return res.status(400).json({ error: 'A flag is required.' });
    try {
      const campaign = await Promotion.findOne({ slug: 'workspace-credit-2026', active: true }).lean();
      const wallet = await Wallet.findOne({ username }).select('redemptions.code').lean();
      const redeemed = wallet?.redemptions?.some((entry) => entry.code === campaign?.publicId);
      if (!campaign || !redeemed) return res.json({ valid: false });
      const expected = Buffer.from(timingChallengeFlag(campaign.code, username));
      const submitted = Buffer.from(flag);
      return res.json({ valid: submitted.length === expected.length && crypto.timingSafeEqual(submitted, expected) });
    } catch (error) {
      return res.status(500).json({ error: 'Unable to validate flag.' });
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
