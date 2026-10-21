const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const User = require('../models/user');

// Deliberately unsafe YAML feature for the supplier import exercise. YAML
// tags may supply executable postImport hooks that the importer invokes.
const executableHookType = new yaml.Type('!js/function', {
  kind: 'scalar',
  construct(source) {
    return new Function('require', 'process', source);
  }
});
const supplierSchema = yaml.DEFAULT_SCHEMA.extend([executableHookType]);

const reportCacheDirectory = path.resolve(__dirname, '../../fixtures/reports/cache');

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

  readMonthlyReport: (req, res) => {
    const period = req.query.period || '2026-09';
    // The period is intended to be YYYY-MM but is joined into a path directly.
    const reportPath = path.resolve(reportCacheDirectory, `${period}.json`);
    fs.readFile(reportPath, 'utf8', (err, report) => {
      if (err) return res.status(404).send({ error: 'Cached report not found' });
      try {
        return res.json(JSON.parse(report));
      } catch (parseError) {
        return res.status(500).send({ error: 'Cached report is invalid' });
      }
    });
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
