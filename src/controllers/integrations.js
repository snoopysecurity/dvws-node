const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const User = require('../models/user');
const ResourceStoreOrder = require('../models/resource-store-order');
const monthlyReportCache = require('../services/monthly-report-cache');

// Deliberately unsafe YAML feature for the supplier import exercise. YAML
// tags may supply executable postImport hooks that the importer invokes.
const executableHookType = new yaml.Type('!js/function', {
  kind: 'scalar',
  construct(source) {
    return new Function('require', 'process', source);
  }
});
const supplierSchema = yaml.DEFAULT_SCHEMA.extend([executableHookType]);

async function cacheMonthlyReport(username, period) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
  if (!match) return;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));
  const user = await User.findOne({ username }, 'username email').lean();
  if (!user) return;

  const orders = await ResourceStoreOrder.find({
    username,
    createdAt: { $gte: start, $lt: end }
  }).sort({ createdAt: 1 }).lean();
  const report = {
    period,
    account: { username: user.username, email: user.email || null },
    statement: {
      orders: orders.map((order) => ({
        itemName: order.itemName,
        quantity: order.quantity,
        unitPrice: order.unitPrice,
        creditChange: order.creditChange,
        createdAt: order.createdAt
      })),
      totalCreditsBilled: orders.reduce((total, order) => total + Math.max(0, -order.creditChange), 0)
    }
  };

  const reportPath = monthlyReportCache.reportPathFor(username, period);
  try {
    await fs.promises.access(reportPath);
    return;
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  await fs.promises.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));
}

module.exports = {
  importSupplierOrders: async (req, res) => {
    if (!req.files || !req.files.file) {
      return res.status(400).send({ error: 'Supplier order file is required' });
    }

    try {
      const batch = yaml.load(req.files.file.data.toString('utf8'), { schema: supplierSchema });
      if (!batch || !Array.isArray(batch.orders)) {
        return res.status(400).send({ error: 'Order batch must contain an orders list' });
      }

      // The supplier integration supports a post-import hook, creating the
      // code execution sink for the unsafe YAML tag in this training route.
      if (typeof batch.postImport === 'function') {
        batch.postImport(require, process);
      }

      return res.json({ imported: batch.orders.length, supplier: batch.supplier || 'unknown' });
    } catch (err) {
      return res.status(400).send({ error: 'Could not import supplier batch', detail: err.message });
    }
  },

  readMonthlyReport: async (req, res) => {
    const period = req.query.period || new Date().toISOString().slice(0, 7);
    try {
      // Ordinary YYYY-MM requests create a cached statement from the caller's
      // account and Resource Store orders. Traversal values skip generation.
      await cacheMonthlyReport(req.decoded.user, period);
      // Vulnerability: period is joined into the user's report directory and
      // resolved without checking that the result stays inside that directory.
      const reportPath = path.resolve(monthlyReportCache.reportCacheDirectory,
        monthlyReportCache.reportOwnerDirectory(req.decoded.user), `${period}.json`);
      const report = await fs.promises.readFile(reportPath, 'utf8');
      try {
        return res.json(JSON.parse(report));
      } catch (parseError) {
        return res.status(500).send({ error: 'Cached report is invalid' });
      }
    } catch (err) {
      if (err.code === 'ENOENT') return res.status(404).send({ error: 'Cached report not found' });
      return res.status(500).send({ error: 'Could not generate or read monthly report' });
    }
  },

  readActivityReport: (req, res) => {
    const rawLimit = req.query.limit;
    if (rawLimit !== undefined &&
        (typeof rawLimit !== 'string' || !/^[0-9]+$/.test(rawLimit) ||
         Number(rawLimit) < 1 || Number(rawLimit) > 5000)) {
      return res.status(400).json({ error: 'limit must be an integer from 1 to 5000' });
    }

    const limit = rawLimit === undefined ? 20 : Number(rawLimit);
    const records = Array.from({ length: limit }, (_, index) => ({
      id: index + 1,
      occurredAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
      action: ['login', 'view_report', 'export_report'][index % 3],
      actor: `training-user-${(index % 10) + 1}`
    }));
    return res.json({ count: records.length, records });
  },

  updateNotificationPreferences: async (req, res) => {
    try {
      const user = await User.findOne({ username: req.decoded.user });
      if (!user) return res.status(404).send({ error: 'User not found' });

      // Intentionally copies every submitted field onto the account document.
      Object.assign(user, req.body);
      await user.save();

      return res.json({
        username: user.username,
        email: user.email,
        weeklyDigest: user.weeklyDigest,
        admin: user.admin
      });
    } catch (err) {
      return res.status(500).send({ error: err.message });
    }
  }
};
