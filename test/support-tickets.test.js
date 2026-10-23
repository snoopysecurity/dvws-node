require('dotenv').config();
const assert = require('assert');
const request = require('supertest')(require('./helpers/base-url'));

describe('UUID support ticket IDOR challenge', function () {
  let testToken;
  let victimToken;

  before(async function () {
    const [testLogin, victimLogin] = await Promise.all([
      request.post('/api/v2/login').send({ username: 'test', password: 'test' }),
      request.post('/api/v2/login').send({ username: 'recovery-victim', password: 'Victim123!' })
    ]);
    assert.strictEqual(testLogin.status, 200);
    assert.strictEqual(victimLogin.status, 200);
    testToken = testLogin.body.token;
    victimToken = victimLogin.body.token;
  });

  it('creates and reads an owned ticket, and permits another authenticated user to read it', async function () {
    const created = await request.post('/api/v2/support/tickets')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ subject: 'Ticket test', message: 'A support request.' });
    assert.strictEqual(created.status, 201);
    assert.match(created.body.ticket._id, /^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.strictEqual(created.body.ticket.username, 'test');

    const ownRead = await request.get(`/api/v2/support/tickets/${created.body.ticket._id}`)
      .set('Authorization', `Bearer ${testToken}`);
    assert.strictEqual(ownRead.status, 200);
    assert.strictEqual(ownRead.body.ticket.message, 'A support request.');

    const crossUserRead = await request.get(`/api/v2/support/tickets/${created.body.ticket._id}`)
      .set('Authorization', `Bearer ${victimToken}`);
    assert.strictEqual(crossUserRead.status, 200);
    assert.strictEqual(crossUserRead.body.ticket.username, 'test');
  });

  it('exposes the seeded victim UUID in notifications and returns stable malformed and unknown ID errors', async function () {
    const inbox = await request.get('/api/v2/notifications').set('Authorization', `Bearer ${testToken}`);
    assert.strictEqual(inbox.status, 200);
    assert.ok(inbox.body.notifications.some((notification) => notification.message.includes('6f1d2a40-2f5b-11ef-9a31-0242ac120002')));

    const victimTicket = await request.get('/api/v2/support/tickets/6f1d2a40-2f5b-11ef-9a31-0242ac120002')
      .set('Authorization', `Bearer ${testToken}`);
    assert.strictEqual(victimTicket.status, 200);
    assert.strictEqual(victimTicket.body.ticket.username, 'recovery-victim');

    const malformed = await request.get('/api/v2/support/tickets/not-a-uuid').set('Authorization', `Bearer ${testToken}`);
    const unknown = await request.get('/api/v2/support/tickets/6f1d2a40-2f5b-11ef-9a31-0242ac120003')
      .set('Authorization', `Bearer ${testToken}`);
    assert.strictEqual(malformed.status, 400);
    assert.deepStrictEqual(malformed.body, { error: 'Invalid ticket ID' });
    assert.strictEqual(unknown.status, 404);
    assert.deepStrictEqual(unknown.body, { error: 'Support ticket not found' });
  });
});
