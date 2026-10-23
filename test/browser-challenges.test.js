require('dotenv').config();
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const baseUrl = require('./helpers/base-url');
const request = require('supertest')(baseUrl);
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

describe('New account and browser challenge flows', function () {
  let testToken;
  let adminId;
  let originalProfileSharing;

  before(async function () {
    const login = await request.post('/api/v2/login').send({ username: 'test', password: 'test' });
    assert.strictEqual(login.status, 200);
    testToken = login.body.token;
    const users = await request.get('/api/v2/users').set('Authorization', `Bearer ${testToken}`);
    adminId = users.body.result.find((user) => user.username === 'admin')._id;
    const settings = await request.get('/api/v2/users/profile-sharing')
      .set('Authorization', `Bearer ${testToken}`);
    assert.strictEqual(settings.status, 200);
    originalProfileSharing = settings.body.profileSharing;
  });

  after(async function () {
    if (!testToken || !originalProfileSharing) return;
    await request.put('/api/v2/users/profile-sharing')
      .set('Authorization', `Bearer ${testToken}`)
      .send(originalProfileSharing);
  });

  it('exposes admin contact fields to a regular user through the target-role check', async function () {
    const response = await request.get(`/api/v2/users/${adminId}/profile-details`)
      .set('Authorization', `Bearer ${testToken}`);
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.email, 'admin@dvws.local');
    assert.ok(response.body.homeAddress);
  });

  it('accepts active HTML content in an XML upload and serves it from the public uploads path', async function () {
    const username = `upload_review_${Date.now()}`;
    const created = await request.post('/api/v2/users').send({ username, password: 'Upload123!' });
    assert.strictEqual(created.status, 201);
    const login = await request.post('/api/v2/login').send({ username, password: 'Upload123!' });
    assert.strictEqual(login.status, 200);

    const filename = `active-content-${Date.now()}.xml`;
    const content = '<html><script>window.uploadProof = true</script></html>';
    const upload = await request.post('/api/upload')
      .set('Authorization', `Bearer ${login.body.token}`)
      .attach('file', Buffer.from(content), { filename, contentType: 'text/xml' });
    assert.strictEqual(upload.status, 200);

    const served = await request.get(`/uploads/${username}/${filename}`);
    assert.strictEqual(served.status, 200);
    assert.match(served.headers['content-type'], /xml/);
    assert.strictEqual(served.text, content);

    const storedPath = path.join(process.cwd(), 'public', 'uploads', username, filename);
    if (fs.existsSync(storedPath)) fs.unlinkSync(storedPath);
  });

  it('lets another account reset and sign into a recovery target', async function () {
    const username = `recovery_review_${Date.now()}`;
    const email = `${username}@dvws.local`;
    const created = await request.post('/api/v2/users').send({ username, password: 'Before123!', email });
    assert.strictEqual(created.status, 201);
    const lookup = await request.post('/api/v2/account-recovery/lookup')
      .set('Authorization', `Bearer ${testToken}`).send({ email });
    assert.strictEqual(lookup.status, 200);
    const reset = await request.post('/api/v2/account-recovery/reset')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ userId: lookup.body.userId, newPassword: 'After123!' });
    assert.strictEqual(reset.status, 200);
    const oldLogin = await request.post('/api/v2/login').send({ username, password: 'Before123!' });
    const newLogin = await request.post('/api/v2/login').send({ username, password: 'After123!' });
    assert.strictEqual(oldLogin.status, 401);
    assert.strictEqual(newLogin.status, 200);
  });

  it('keeps a token from a second ordinary login valid after a password change', async function () {
    const username = `session_review_${Date.now()}`;
    assert.strictEqual((await request.post('/api/v2/users').send({ username, password: 'Before123!' })).status, 201);
    const login = await request.post('/api/v2/login').send({ username, password: 'Before123!' });
    const secondLogin = await request.post('/api/v2/login').send({ username, password: 'Before123!' });
    assert.strictEqual(secondLogin.status, 200);
    const changed = await request.post('/api/v2/users/change-password')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ currentPassword: 'Before123!', newPassword: 'After123!' });
    assert.strictEqual(changed.status, 200);
    const oldSession = await request.get(`/api/v2/users/profile?session-check=${username}`)
      .set('Authorization', `Bearer ${secondLogin.body.token}`);
    assert.strictEqual(oldSession.status, 200);
    assert.strictEqual(oldSession.body.username, username);
    assert.strictEqual((await request.post('/api/v2/login').send({ username, password: 'Before123!' })).status, 401);
    assert.strictEqual((await request.post('/api/v2/login').send({ username, password: 'After123!' })).status, 200);
  });

  it('allows the real cookie-authenticated text/plain admin creation request', async function () {
    const adminLogin = await request.post('/api/v2/login').send({ username: 'admin', password: 'letmein' });
    assert.strictEqual(adminLogin.status, 200);
    const username = `csrf_created_${Date.now()}`;
    const created = await request.post('/api/v2/admin/create-user')
      .set('Cookie', `auth_token=${encodeURIComponent(adminLogin.body.token)}`)
      .set('Content-Type', 'text/plain')
      .send(JSON.stringify({ username, password: 'CSRFcreated123!', admin: true }));
    assert.strictEqual(created.status, 200);
    assert.match(created.body.message, new RegExp(username));
    const users = await request.get('/api/v2/users').set('Authorization', `Bearer ${adminLogin.body.token}`);
    assert.strictEqual(users.body.result.find((user) => user.username === username).admin, true);
  });

  it('updates ordinary notification preferences without changing the account role', async function () {
    const username = `notification_preferences_${Date.now()}`;
    const created = await request.post('/api/v2/users').send({ username, password: 'Prefs123!' });
    assert.strictEqual(created.status, 201);
    const login = await request.post('/api/v2/login').send({ username, password: 'Prefs123!' });
    const updated = await request.put('/api/v2/users/notification-preferences')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ email: 'test-notifications@dvws.local', weeklyDigest: true });
    assert.strictEqual(updated.status, 200);
    assert.strictEqual(updated.body.email, 'test-notifications@dvws.local');
    assert.strictEqual(updated.body.weeklyDigest, true);
    assert.strictEqual(updated.body.admin, false);
  });

  it('uses the documented HTTP and HTTPS login-cookie policies for both login routes', async function () {
    const standard = await request.post('/api/v2/login').send({ username: 'test', password: 'test' });
    const legacy = await request.post('/api/v1/login').send({ username: 'test' });
    for (const response of [standard, legacy]) {
      assert.strictEqual(response.status, 200);
      assert.match(response.headers['set-cookie'][0], /HttpOnly/);
      assert.match(response.headers['set-cookie'][0], /SameSite=Lax/);
      assert.doesNotMatch(response.headers['set-cookie'][0], /Secure/);
    }
    const controller = require('../src/controllers/users');
    assert.deepStrictEqual(controller.authCookieOptions({ secure: true, protocol: 'https' }), {
      httpOnly: true, secure: true, sameSite: 'none', path: '/'
    });
  });

  it('persists selected profile sharing and exposes it through authenticated JSONP without checking Origin', async function () {
    const settingsPath = '/api/v2/users/profile-sharing';
    const saved = await request.put(settingsPath).set('Authorization', `Bearer ${testToken}`).send({
      enabled: true, partnerOrigin: 'https://partner.test:8443', fields: ['username', 'email']
    });
    assert.strictEqual(saved.status, 200);
    assert.deepStrictEqual(saved.body.profileSharing.fields, ['username', 'email']);

    const loaded = await request.get(settingsPath).set('Authorization', `Bearer ${testToken}`);
    assert.strictEqual(loaded.body.profileSharing.enabled, true);
    assert.strictEqual(loaded.body.profileSharing.partnerOrigin, 'https://partner.test:8443');

    const profile = await request.get('/api/v2/profile-sharing/jsonp?callback=captureProfile')
      .set('Origin', 'https://attacker.test:8443')
      .set('Cookie', `auth_token=${encodeURIComponent(testToken)}`);
    assert.strictEqual(profile.status, 200);
    assert.match(profile.headers['content-type'], /javascript/);
    assert.match(profile.text, /^captureProfile\(.*test@dvws\.local.*\);$/);
    assert.doesNotMatch(profile.text, /homeAddress/);

    const invalidCallback = await request.get('/api/v2/profile-sharing/jsonp?callback=bad-name')
      .set('Cookie', `auth_token=${encodeURIComponent(testToken)}`);
    assert.strictEqual(invalidCallback.status, 400);
    const unauthenticated = await request.get('/api/v2/profile-sharing/jsonp?callback=cb');
    assert.strictEqual(unauthenticated.status, 401);
    const expired = jwt.sign({ user: 'test' }, process.env.JWT_SECRET, {
      issuer: 'https://github.com/snoopysecurity', algorithm: 'HS256', expiresIn: -1
    });
    const expiredAuth = await request.get('/api/v2/profile-sharing/jsonp?callback=cb')
      .set('Cookie', `auth_token=${encodeURIComponent(expired)}`);
    assert.strictEqual(expiredAuth.status, 401);

    const revoked = await request.put(settingsPath).set('Authorization', `Bearer ${testToken}`).send({
      enabled: false, partnerOrigin: 'https://partner.test:8443', fields: ['username', 'email']
    });
    assert.strictEqual(revoked.status, 200);
    const disabled = await request.get('/api/v2/profile-sharing/jsonp?callback=cb')
      .set('Cookie', `auth_token=${encodeURIComponent(testToken)}`);
    assert.strictEqual(disabled.status, 403);

  });

  it('leaks a profile between authenticated users through the shared profile cache', async function () {
    const username = `profile_cache_${Date.now()}`;
    assert.strictEqual((await request.post('/api/v2/users')
      .send({ username, password: 'Cache123!', email: `${username}@dvws.local` })).status, 201);
    const observerName = `${username}_observer`;
    assert.strictEqual((await request.post('/api/v2/users')
      .send({ username: observerName, password: 'Observe123!' })).status, 201);
    const observer = await request.post('/api/v2/login')
      .send({ username: observerName, password: 'Observe123!' });
    assert.strictEqual(observer.status, 200);
    const path = `/api/v2/users/profile?cache-check=${username}`;
    const owner = await request.post('/api/v2/login')
      .send({ username, password: 'Cache123!' });
    assert.strictEqual(owner.status, 200);
    const first = await request.get(path)
      .set('Authorization', `Bearer ${owner.body.token}`);
    const second = await request.get(path)
      .set('Authorization', `Bearer ${observer.body.token}`);
    assert.strictEqual(first.status, 200);
    assert.strictEqual(second.status, 200);
    assert.match(first.headers['cache-control'], /public/);
    assert.match(first.headers['cache-control'], /s-maxage=60/);
    assert.match(first.headers.vary || '', /Origin/);
    assert.doesNotMatch(first.headers.vary || '', /Authorization|Cookie/i);
    assert.ok(second.headers.age !== undefined);
    assert.strictEqual(second.body.username, username);
    assert.strictEqual(second.body.email, `${username}@dvws.local`);
  });

  it('seeds isolated inboxes and persists an owned read state', async function () {
    const inbox = await request.get('/api/v2/notifications').set('Authorization', `Bearer ${testToken}`);
    assert.strictEqual(inbox.status, 200);
    assert.strictEqual(inbox.body.notifications.length, 3);
    const first = inbox.body.notifications[0];
    const marked = await request.put(`/api/v2/notifications/${first._id}/read`)
      .set('Authorization', `Bearer ${testToken}`);
    assert.strictEqual(marked.status, 200);
    assert.strictEqual(marked.body.notification.read, true);

    const otherName = `notification_other_${Date.now()}`;
    await request.post('/api/v2/users').send({ username: otherName, password: 'Other123!' });
    const otherLogin = await request.post('/api/v2/login').send({ username: otherName, password: 'Other123!' });
    const otherInbox = await request.get('/api/v2/notifications').set('Authorization', `Bearer ${otherLogin.body.token}`);
    assert.strictEqual(otherInbox.body.notifications.length, 3);
    const forbidden = await request.put(`/api/v2/notifications/${first._id}/read`)
      .set('Authorization', `Bearer ${otherLogin.body.token}`);
    assert.strictEqual(forbidden.status, 404);
  });

  it('accepts a cross-origin WebSocket with the normal login cookie and marks an owned notification read', async function () {
    const login = await request.post('/api/v2/login').send({ username: 'test', password: 'test' });
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    assert.match(login.headers['set-cookie'][0], /HttpOnly/);
    assert.match(login.headers['set-cookie'][0], /SameSite=Lax/);
    await new Promise((resolve, reject) => {
      const socket = new WebSocket(`${baseUrl.replace(/^http/, 'ws')}/ws/notifications`, {
        headers: { Cookie: cookie, Origin: 'https://attacker.test:8443' }
      });
      const timeout = setTimeout(() => { socket.terminate(); reject(new Error('Notification WebSocket timed out')); }, 3000);
      socket.on('error', (error) => { clearTimeout(timeout); reject(error); });
      socket.on('message', (raw) => {
        const message = JSON.parse(raw.toString());
        if (message.type === 'snapshot') socket.send(JSON.stringify({ type: 'mark-read', id: message.notifications[0]._id }));
        if (message.type === 'read') {
          assert.strictEqual(message.success, true);
          clearTimeout(timeout);
          socket.close();
          resolve();
        }
      });
    });
  });

  it('rejects missing or invalid login cookies during a notification WebSocket upgrade', async function () {
    async function expectRejected(headers) {
      await new Promise((resolve, reject) => {
        const socket = new WebSocket(`${baseUrl.replace(/^http/, 'ws')}/ws/notifications`, { headers });
        const timeout = setTimeout(() => { socket.terminate(); reject(new Error('Expected WebSocket rejection')); }, 3000);
        socket.on('unexpected-response', (_request, response) => {
          clearTimeout(timeout);
          assert.strictEqual(response.statusCode, 401);
          response.resume();
          resolve();
        });
        socket.on('error', (error) => { clearTimeout(timeout); reject(error); });
      });
    }
    await expectRejected({ Origin: 'https://attacker.test:8443' });
    await expectRejected({ Cookie: 'auth_token=not-a-jwt', Origin: 'https://attacker.test:8443' });
  });

  it('rejects a notification read over WebSocket when the notification belongs to another account', async function () {
    const ownerInbox = await request.get('/api/v2/notifications').set('Authorization', `Bearer ${testToken}`);
    const username = `socket_other_${Date.now()}`;
    await request.post('/api/v2/users').send({ username, password: 'Other123!' });
    const otherLogin = await request.post('/api/v2/login').send({ username, password: 'Other123!' });
    const cookie = otherLogin.headers['set-cookie'][0].split(';')[0];
    await new Promise((resolve, reject) => {
      const socket = new WebSocket(`${baseUrl.replace(/^http/, 'ws')}/ws/notifications`, {
        headers: { Cookie: cookie, Origin: 'https://attacker.test:8443' }
      });
      const timeout = setTimeout(() => { socket.terminate(); reject(new Error('Ownership WebSocket check timed out')); }, 3000);
      socket.on('error', (error) => { clearTimeout(timeout); reject(error); });
      socket.on('message', (raw) => {
        const message = JSON.parse(raw.toString());
        if (message.type === 'snapshot') socket.send(JSON.stringify({ type: 'mark-read', id: ownerInbox.body.notifications[0]._id }));
        if (message.type === 'read') {
          assert.strictEqual(message.success, false);
          clearTimeout(timeout);
          socket.close();
          resolve();
        }
      });
    });
  });
});
