const port = process.env.EXPRESS_JS_PORT || 80;
const request = require("supertest")(`http://127.0.0.1:${port}`);
const expect = require("chai").expect;

describe("GET /openAPI-spec.json", function () {
  it("should return the OpenAPI spec as JSON", async function () {
    const response = await request
      .get("/openAPI-spec.json")
      .send();

    expect(response.status).to.eql(200);
    expect(response.headers["content-type"]).to.include("application/json");
    expect(response.body).to.have.property("openapi");
    expect(response.body.info.title).to.eql("DVWS API");
  });
});
