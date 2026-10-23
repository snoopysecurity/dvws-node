require('dotenv').config();
const assert = require('assert');
const request = require('supertest')(require('./helpers/base-url'));

describe('Resource Store negative quantity challenge', function () {
  let aliceToken;
  let bobToken;

  async function createUser(username) {
    const created = await request.post('/api/v2/users').send({ username, password: 'ResourceStore123!' });
    assert.strictEqual(created.status, 201);
    const login = await request.post('/api/v2/login').send({ username, password: 'ResourceStore123!' });
    assert.strictEqual(login.status, 200);
    return login.body.token;
  }

  before(async function () {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    [aliceToken, bobToken] = await Promise.all([createUser(`store-alice-${suffix}`), createUser(`store-bob-${suffix}`)]);
  });

  it('initializes a private wallet, records normal and negative orders, and rejects invalid requests', async function () {
    const alice = { Authorization: `Bearer ${aliceToken}` };
    const bob = { Authorization: `Bearer ${bobToken}` };
    const initial = await request.get('/api/v2/resource-store').set(alice);
    assert.strictEqual(initial.status, 200);
    assert.strictEqual(initial.body.balance, 100);
    assert.ok(initial.body.catalogue.some((item) => item.id === 'api-monitor' && item.price === 10));
    assert.deepStrictEqual(initial.body.orders, []);

    const normal = await request.post('/api/v2/resource-store/orders').set(alice).send({ itemId: 'api-monitor', quantity: 2 });
    assert.strictEqual(normal.status, 201);
    assert.strictEqual(normal.body.balance, 80);
    assert.strictEqual(normal.body.order.quantity, 2);
    assert.strictEqual(normal.body.order.creditChange, -20);

    const negative = await request.post('/api/v2/resource-store/orders').set(alice).send({ itemId: 'api-monitor', quantity: -100 });
    assert.strictEqual(negative.status, 201);
    assert.strictEqual(negative.body.balance, 1080);
    assert.strictEqual(negative.body.order.quantity, -100);
    assert.strictEqual(negative.body.order.creditChange, 1000);

    const bobStore = await request.get('/api/v2/resource-store').set(bob);
    assert.strictEqual(bobStore.body.balance, 100);
    assert.deepStrictEqual(bobStore.body.orders, []);

    for (const bad of [
      { itemId: 'api-monitor', quantity: 0 },
      { itemId: 'api-monitor', quantity: 1.5 },
      { itemId: 'api-monitor', quantity: 1001 },
      { itemId: 'unknown', quantity: 1 }
    ]) {
      const response = await request.post('/api/v2/resource-store/orders').set(alice).send(bad);
      assert.strictEqual(response.status, 400);
    }
    const afterInvalid = await request.get('/api/v2/resource-store').set(alice);
    assert.strictEqual(afterInvalid.body.balance, 1080);
    assert.strictEqual(afterInvalid.body.orders.length, 2);
  });

  it('requires authentication for reads and orders', async function () {
    assert.strictEqual((await request.get('/api/v2/resource-store')).status, 401);
    assert.strictEqual((await request.post('/api/v2/resource-store/orders').send({ itemId: 'api-monitor', quantity: 1 })).status, 401);
  });
});
