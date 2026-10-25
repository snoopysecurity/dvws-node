const request = require("supertest")(require('./helpers/base-url'));
const expect = require("chai").expect;
const fs = require('fs');

describe("Prototype Pollution Test", function () {
  let authToken;

  before(async function () {
    // Create regular user
    try {
      await request.post("/api/v2/users").send({ username: "pptest", password: "pptest" });
    } catch (e) {
      // User might already exist
    }

    // Get regular user token
    const loginResponse = await request.post("/api/v2/login").send({ username: "pptest", password: "pptest" });
    authToken = loginResponse.body.token;
  });

  it("should let polluted upload metadata change ordinary file type validation", async function () {
    this.timeout(10000);

    // Create a dummy file
    fs.writeFileSync('test_pp.html', '<h1>uploaded by polluted policy</h1>');

    // Send malicious request
    const response = await request
        .post("/api/upload")
        .set('Authorization', 'Bearer ' + authToken)
        .attach('file', 'test_pp.html')
        .field('metadata', '{"__proto__": {"allowedExtension": ".html"}}');

    expect(response.status).to.eql(200);
    expect(response.body).to.include({ status: 'uploaded', filename: 'test_pp.html', extension: '.html' });
    
    // Verify server is NOT crashed by sending a simple request
    // We expect a response (even error is fine, just not connection refused)
    try {
        await request.get("/api/v2/users");
    } catch (e) {
         if (e.code === 'ECONNREFUSED' || e.code === 'ECONNRESET') {
             throw new Error("Server crashed!");
         }
    }

    const storedPath = require('path').join(process.cwd(), 'public', 'uploads', 'pptest', 'test_pp.html');
    expect(fs.existsSync(storedPath)).to.equal(true);
    fs.unlinkSync(storedPath);

    // Prove the polluted inherited policy affects the next ordinary upload,
    // then neutralize the shared prototype value so later tests stay isolated.
    fs.writeFileSync('test_pp_followup.html', '<h1>inherited policy</h1>');
    const followup = await request.post('/api/upload')
        .set('Authorization', 'Bearer ' + authToken)
        .attach('file', 'test_pp_followup.html');
    expect(followup.status).to.eql(200);
    fs.unlinkSync(require('path').join(process.cwd(), 'public', 'uploads', 'pptest', 'test_pp_followup.html'));
    fs.writeFileSync('test_pp_reset.xml', '<root></root>');
    const reset = await request.post('/api/upload')
        .set('Authorization', 'Bearer ' + authToken)
        .attach('file', 'test_pp_reset.xml')
        .field('metadata', '{"__proto__":{"allowedExtension":null}}');
    expect(reset.status).to.eql(200);
    fs.unlinkSync(require('path').join(process.cwd(), 'public', 'uploads', 'pptest', 'test_pp_reset.xml'));
    fs.writeFileSync('test_pp_rejected.html', '<h1>default policy restored</h1>');
    const rejected = await request.post('/api/upload')
        .set('Authorization', 'Bearer ' + authToken)
        .attach('file', 'test_pp_rejected.html');
    expect(rejected.status).to.eql(400);
    
    // Cleanup
    if (fs.existsSync('test_pp.html')) {
        fs.unlinkSync('test_pp.html');
    }
    for (const filename of ['test_pp_followup.html', 'test_pp_reset.xml', 'test_pp_rejected.html']) {
        if (fs.existsSync(filename)) fs.unlinkSync(filename);
    }
  });
});
