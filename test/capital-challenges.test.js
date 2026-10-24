require('dotenv').config();
const request = require('supertest')(require('./helpers/base-url'));
const expect = require('chai').expect;

describe('Capital-inspired authentication and activity challenges', function () {
  let legacyToken;

  it('keeps v2 password verification but lets an existing user log in through v1 with a wrong password', async function () {
    const credentials = { username: 'test', password: 'definitely-not-the-test-password' };
    const current = await request.post('/api/v2/login').send(credentials);
    expect(current.status).to.eql(401);
    expect(current.body.token).to.be.undefined;

    const legacy = await request.post('/api/v1/login').send(credentials);
    expect(legacy.status).to.eql(200);
    expect(legacy.body.token).to.be.a('string');
    expect(legacy.body.result.username).to.eql('test');
    expect(legacy.body.result).not.to.have.property('password');
    legacyToken = legacy.body.token;

    const notes = await request.get('/api/v2/notes')
      .set('Authorization', `Bearer ${legacyToken}`);
    expect(notes.status).to.eql(200);

    const unknown = await request.post('/api/v1/login')
      .send({ username: `missing_${Date.now()}`, password: 'anything' });
    expect(unknown.status).to.eql(404);
    expect(unknown.body.token).to.be.undefined;
  });

  it('returns recorded account actions and makes the oversized response measurably larger', async function () {
    const username = `activity_${Date.now()}`;
    const password = 'Activity123!';
    const created = await request.post('/api/v2/users').send({ username, password });
    expect(created.status).to.eql(201);
    const login = await request.post('/api/v2/login').send({ username, password });
    expect(login.status).to.eql(200);
    const token = login.body.token;
    const noteIds = [];
    for (let index = 0; index < 45; index++) {
      const note = await request.post('/api/v2/notes')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: `Activity ${index}`, body: `Recorded note ${index}`, type: 'public' });
      expect(note.status).to.eql(200);
      noteIds.push(String(note.body._id));
    }
    const purchase = await request.post('/api/v2/resource-store/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ itemId: 'api-monitor', quantity: 1 });
    expect(purchase.status).to.eql(201);

    const unauthenticated = await request.get('/api/v2/reports/activity');
    expect(unauthenticated.status).to.eql(401);

    const ordinary = await request.get('/api/v2/reports/activity')
      .set('Authorization', `Bearer ${token}`);
    expect(ordinary.status).to.eql(200);
    expect(ordinary.body.count).to.eql(20);
    expect(ordinary.body.records).to.have.lengthOf(20);

    const large = await request.get('/api/v2/reports/activity')
      .set('Authorization', `Bearer ${token}`)
      .query({ limit: 5000 });
    expect(large.status).to.eql(200);
    expect(large.body.count).to.eql(47);
    expect(large.body.records).to.have.lengthOf(47);
    expect(large.body.records.slice(0, 20)).to.deep.eql(ordinary.body.records);
    expect(large.body.records.every((event) => event.actor === username)).to.eql(true);
    expect(large.body.records.filter((event) => event.action === 'note.created').map((event) => event.subject).sort())
      .to.deep.eql(noteIds.sort());
    expect(large.body.records.some((event) => event.action === 'login')).to.eql(true);
    expect(large.body.records.some((event) => event.action === 'resource_order.created' &&
      event.subject === purchase.body.order._id)).to.eql(true);
    expect(Buffer.byteLength(large.text)).to.be.greaterThan(Buffer.byteLength(ordinary.text) * 2);
  });

  it('rejects invalid and excessive activity limits', async function () {
    for (const limit of ['0', '-1', '1.5', 'abc', '5001', '1e3']) {
      const response = await request.get('/api/v2/reports/activity')
        .set('Authorization', `Bearer ${legacyToken}`)
        .query({ limit });
      expect(response.status, `limit=${limit}`).to.eql(400);
    }
  });

  it('publishes the activity report in OpenAPI but omits legacy login', async function () {
    const spec = await request.get('/openAPI-spec.json');
    expect(spec.status).to.eql(200);
    const report = spec.body.paths['/v2/reports/activity'].get;
    expect(report).to.be.an('object');
    expect(report.parameters).to.deep.include({
      name: 'limit', in: 'query', required: false,
      schema: { type: 'integer', minimum: 1, maximum: 5000, default: 20 },
      description: 'Maximum number of recorded account events to return'
    });
    expect(report.security).to.deep.eql([{ bearerAuth: [] }]);
    expect(spec.body.components.securitySchemes.bearerAuth).to.deep.eql({
      type: 'http', scheme: 'bearer', bearerFormat: 'JWT'
    });
    expect(spec.body.paths).not.to.have.property('/v1/login');
  });
});
