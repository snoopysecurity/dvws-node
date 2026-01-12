const request = require("supertest")("http://127.0.0.1");
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

  it("should be vulnerable to prototype pollution (safe check)", async function () {
    this.timeout(10000);

    // Create a dummy file
    fs.writeFileSync('test_pp.xml', '<root></root>');

    // Send malicious request
    const response = await request
        .post("/api/upload")
        .set('Authorization', 'Bearer ' + authToken)
        .attach('file', 'test_pp.xml')
        .field('metadata', '{"__proto__": {"testPollution": true}}');

    // Expect the special response indicating pollution was successful
    expect(response.status).to.eql(200);
    expect(response.body).to.have.property('polluted', true);
    
    // Verify server is NOT crashed by sending a simple request
    // We expect a response (even error is fine, just not connection refused)
    try {
        await request.get("/api/v2/users");
    } catch (e) {
         if (e.code === 'ECONNREFUSED' || e.code === 'ECONNRESET') {
             throw new Error("Server crashed!");
         }
    }
    
    // Cleanup
    if (fs.existsSync('test_pp.xml')) {
        fs.unlinkSync('test_pp.xml');
    }
  });
});
