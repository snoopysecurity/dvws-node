require('dotenv').config();
const request = require('supertest')(require('./helpers/base-url'));
const expect = require('chai').expect;

describe('API protocol weaknesses in existing app flows', function () {
  let token;

  before(async function () {
    const login = await request.post('/api/v2/login').send({ username: 'test', password: 'test' });
    token = login.body.token;
    expect(token).to.be.a('string');
  });

  it('accepts login credentials in the URL and accepts Base64 as supposedly encrypted input', async function () {
    const queryLogin = await request.get('/api/v2/login')
      .query({ username: 'test', password: 'test' });
    expect(queryLogin.status).to.eql(200);
    expect(queryLogin.body.token).to.be.a('string');

    const encodedLogin = await request.post('/api/v2/login')
      .send({ username: 'test', encryptedPassword: Buffer.from('test').toString('base64') });
    expect(encodedLogin.status).to.eql(200);
    expect(encodedLogin.body.token).to.be.a('string');
  });

  it('ignores Accept and returns JSON from the authenticated profile route', async function () {
    const response = await request.get('/api/v2/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/xml');

    expect(response.status).to.eql(200);
    expect(response.headers['content-type']).to.include('application/json');
  });

  it('allows a state-changing notification read through GET', async function () {
    const inbox = await request.get('/api/v2/notifications')
      .set('Authorization', `Bearer ${token}`);
    expect(inbox.status).to.eql(200);
    const notification = inbox.body.notifications[0];

    const changed = await request.get(`/api/v2/notifications/${notification._id}/read`)
      .set('Authorization', `Bearer ${token}`);
    expect(changed.status).to.eql(200);
    expect(changed.body.notification.read).to.eql(true);
  });

  it('accepts a POST method override for the existing preferences update', async function () {
    const response = await request.post('/api/v2/users/notification-preferences')
      .set('Authorization', `Bearer ${token}`)
      .set('X-HTTP-Method-Override', 'PUT')
      .send({ weeklyDigest: true });

    expect(response.status).to.eql(200);
    expect(response.body.weeklyDigest).to.eql(true);

    const unsupported = await request.post('/api/v2/users/notification-preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ weeklyDigest: false });
    expect(unsupported.status).to.eql(405);
  });

  it('accepts the admin user-creation body as JSON, form data, and JSON sent as text/plain', async function () {
    const adminLogin = await request.post('/api/v2/login')
      .send({ username: 'admin', password: 'letmein' });
    expect(adminLogin.status).to.eql(200);
    const cookie = adminLogin.headers['set-cookie'];
    expect(cookie).to.exist;

    const names = {
      json: `format_json_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      form: `format_form_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text: `format_text_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    };
    const createAs = (username) => ({ username, password: 'Format123!', admin: true });
    const json = await request.post('/api/v2/admin/create-user')
      .set('Cookie', cookie)
      .send(createAs(names.json));
    const form = await request.post('/api/v2/admin/create-user')
      .set('Cookie', cookie)
      .type('form')
      .send(createAs(names.form));
    const textPlain = await request.post('/api/v2/admin/create-user')
      .set('Cookie', cookie)
      .type('text')
      .send(JSON.stringify(createAs(names.text)));

    expect(json.status).to.eql(200);
    expect(form.status).to.eql(200);
    expect(textPlain.status).to.eql(200);

    const logins = await Promise.all(Object.entries(names).map(([format, username]) =>
      request.post('/api/v2/login').send({ username, password: 'Format123!' }).then((response) => ({ format, response }))));
    const adminByFormat = Object.fromEntries(logins.map(({ format, response }) => [format, response.body.result.admin]));
    expect(adminByFormat).to.eql({ json: false, form: false, text: true });
  });

  it('serves the authenticated monthly report with shared-cache directives and no request limit', async function () {
    const responses = await Promise.all(Array.from({ length: 105 }, () =>
      request.get('/api/v2/reports/monthly').set('Authorization', `Bearer ${token}`)));

    expect(responses[0].status).to.eql(200);
    expect(responses[0].headers['cache-control']).to.include('public');
    expect(responses.every((response) => response.status !== 429)).to.eql(true);
  });
});
