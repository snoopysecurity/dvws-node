const fs = require('fs');
const os = require('os');
const path = require('path');

const reportCacheDirectory = path.join(os.tmpdir(), 'dvws-monthly-report-cache');

function reportOwnerDirectory(username) {
  return encodeURIComponent(username).replace(/\./g, '%2E');
}

function reportPathFor(username, period) {
  return path.join(reportCacheDirectory, reportOwnerDirectory(username), `${period}.json`);
}

async function invalidateMonthlyReport(username, period = new Date().toISOString().slice(0, 7)) {
  try {
    await fs.promises.unlink(reportPathFor(username, period));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

module.exports = { reportCacheDirectory, reportOwnerDirectory, reportPathFor, invalidateMonthlyReport };
