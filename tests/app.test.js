const request = require("supertest");
const app = require("../app.js");



describe("POST /v2/users", () => {
    describe("given a username and password", () => {
  
      test("should respond with a 200 status code", async () => {
        const response = await request(app).post("/v2/users").send({
          username: "test",
          password: "test"
        })
        expect(response.statusCode).toBe(200)
      })

    })
    })