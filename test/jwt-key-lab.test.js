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

  it('accepts an RS256 token using the public key at its jku URL', async function () {
    const token = jwt.sign({ sub: 'admin@dvws.local' }, privateKey, {
      algorithm: 'RS256',
      header: { jku: jwksUrl, kid: 'test-key' }
    });
    const response = await request.get('/api/v2/jwt-key-lab/jku/profile')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.profile.email, 'admin@dvws.local');
    assert.strictEqual(response.body.authenticatedAs, 'admin@dvws.local');
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
});
