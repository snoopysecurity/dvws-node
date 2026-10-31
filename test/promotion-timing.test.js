require('dotenv').config();
const assert = require('assert');
const crypto = require('crypto');
const mongoose = require('mongoose');
const request = require('supertest')(require('./helpers/base-url'));
const Promotion = require('../src/models/resource-store-promotion');

describe('Resource Store promotion timing side channel', function () {
  this.timeout(20000);
  let campaign;
  let alice;
  let bob;

  async function createAccount(username) {
    const password = 'TimingChallenge123!';
    assert.strictEqual((await request.post('/api/v2/users').send({ username, password })).status, 201);
    const login = await request.post('/api/v2/login').send({ username, password });
    assert.strictEqual(login.status, 200);
    return { username, auth: { Authorization: `Bearer ${login.body.token}` } };
  }

  function expectedFlag(username) {
    const digest = crypto.createHash('sha256').update(`${campaign.code}\0${username}`).digest('hex').slice(0, 16);
    return `DVWS{promotion_timing_${digest}}`;
  }

  async function redeem(auth, code) {
    return request.post('/api/v2/resource-store/promotions/redeem').set(auth).send({ code });
  }

  async function validate(auth, flag) {
    return request.post('/api/v2/resource-store/promotions/timing/validate').set(auth).send({ flag });
  }

  before(async function () {
    const connection = await mongoose.createConnection(process.env.MONGO_LOCAL_CONN_URL).asPromise();
    try {
      campaign = await connection.collection(Promotion.collection.name)
        .findOne({ slug: 'workspace-credit-2026' });
      assert.ok(campaign, 'seed the database before running this test');
      assert.match(campaign.code, /^OPS-[0-9A-F]{12}$/);
    } finally {
      await connection.close();
    }
    const suffix = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    alice = await createAccount(`timing-alice-${suffix}`);
    bob = await createAccount(`timing-bob-${suffix}`);
  });

  it('requires authentication and rejects malformed requests', async function () {
    assert.strictEqual((await request.post('/api/v2/resource-store/promotions/redeem')
      .send({ code: campaign.code })).status, 401);
    assert.strictEqual((await request.post('/api/v2/resource-store/promotions/timing/validate')
      .send({ flag: expectedFlag(alice.username) })).status, 401);
    for (const value of [undefined, null, 42, '', ' ', 'X'.repeat(101)]) {
      assert.strictEqual((await redeem(alice.auth, value)).status, 400);
      assert.strictEqual((await validate(alice.auth, value)).status, 400);
    }
    assert.strictEqual((await redeem(alice.auth, 'NO-SUCH-PROMOTION')).status, 404);
    assert.strictEqual((await redeem(alice.auth, 'OPS-.*')).status, 404);
  });

  it('keeps flags unavailable before redemption and out of public responses', async function () {
    const flag = expectedFlag(alice.username);
    const initial = await request.get('/api/v2/resource-store').set(alice.auth);
    assert.strictEqual(initial.status, 200);
    assert.strictEqual(initial.body.balance, 100);
    assert.deepStrictEqual((await validate(alice.auth, flag)).body, { valid: false });
    const spec = await request.get('/openAPI-spec.json');
    assert.strictEqual(spec.status, 200);
    assert.ok(spec.body.paths['/v2/resource-store/promotions/timing/validate']?.post);
    assert.ok(!JSON.stringify(spec.body).includes(campaign.code));
    assert.ok(!JSON.stringify(initial.body).includes(campaign.code));
    assert.ok(!JSON.stringify(initial.body).includes(flag));
  });

  it('exposes a measurable prefix delay with identical 404 responses', async function () {
    const prefix = campaign.code.slice(0, 7);
    const wrongPrefix = `${prefix.slice(0, -1)}${prefix.at(-1) === 'A' ? 'B' : 'A'}`;
    async function probe(value) {
      const start = process.hrtime.bigint();
      const response = await redeem(alice.auth, value);
      const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
      assert.strictEqual(response.status, 404);
      assert.deepStrictEqual(response.body, { error: 'Promotion code not found.' });
      return elapsedMs;
    }
    await probe(wrongPrefix);
    const slow = [];
    const fast = [];
    for (let i = 0; i < 5; i++) {
      fast.push(await probe(wrongPrefix));
      slow.push(await probe(prefix));
    }
    const median = (values) => [...values].sort((a, b) => a - b)[2];
    assert.ok(median(slow) - median(fast) >= 15,
      `matching prefix should be slower: fast=${fast}, slow=${slow}`);
    assert.deepStrictEqual((await validate(alice.auth, expectedFlag(alice.username))).body, { valid: false });
  });

  it('issues account-specific flags once and validates only the caller’s flag', async function () {
    const first = await redeem(alice.auth, campaign.code.toLowerCase());
    assert.strictEqual(first.status, 200);
    assert.strictEqual(first.body.credits, 175);
    assert.strictEqual(first.body.balance, 275);
    assert.strictEqual(first.body.redemption.code, campaign.publicId);
    assert.strictEqual(first.body.flag, expectedFlag(alice.username));
    assert.match(first.body.flag, /^DVWS\{promotion_timing_[a-f0-9]{16}\}$/);
    assert.strictEqual((await redeem(alice.auth, campaign.code)).status, 409);
    const aliceWallet = await request.get('/api/v2/resource-store').set(alice.auth);
    assert.strictEqual(aliceWallet.body.balance, 275);
    assert.strictEqual(aliceWallet.body.redemptions.filter((item) => item.code === campaign.publicId).length, 1);
    assert.ok(!JSON.stringify(aliceWallet.body).includes(first.body.flag));

    assert.deepStrictEqual((await validate(bob.auth, first.body.flag)).body, { valid: false });
    assert.deepStrictEqual((await validate(alice.auth, 'DVWS{wrong}')).body, { valid: false });
    assert.deepStrictEqual((await validate(alice.auth, first.body.flag)).body, { valid: true });
    assert.deepStrictEqual((await validate(alice.auth, first.body.flag)).body, { valid: true });

    const second = await redeem(bob.auth, campaign.code);
    assert.strictEqual(second.status, 200);
    assert.strictEqual(second.body.flag, expectedFlag(bob.username));
    assert.notStrictEqual(second.body.flag, first.body.flag);
    assert.deepStrictEqual((await validate(bob.auth, first.body.flag)).body, { valid: false });
    assert.deepStrictEqual((await validate(alice.auth, second.body.flag)).body, { valid: false });
    assert.deepStrictEqual((await validate(bob.auth, second.body.flag)).body, { valid: true });
    assert.strictEqual((await redeem(bob.auth, campaign.code)).status, 409);
  });
});
