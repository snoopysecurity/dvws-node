const request = require("supertest")("http://127.0.0.1/api/v2");
const expect = require("chai").expect;

//const request = require('supertest-with-proxy')("http://127.0.0.1/api/v2");
//      .proxy('http://127.0.0.1:8081')

describe("POST /users", function () {
  it("register a new user to the API", async function () {
    // Use a random user to avoid conflicts
    const randomUser = "test" + Date.now();
    const response = await request
      .post("/users")
      .send({ username: randomUser, password: "password" });

    expect(response.status).to.eql(201);
    expect(response.body.user).to.eql(randomUser);
  });
});


describe("POST /login", function () {
  it("login to the API and returns a token", async function () {
    // Create fresh user
    const username = "login_test_" + Date.now();
    await request.post("/users").send({ username, password: "password" });

    const response = await request
      .post("/login")
      .send({ username, password: "password" });

    const token = response.body.token;
    expect(response.status).to.eql(200);

    expect(response.body.result.admin).to.eql(false);
    expect(response.body.result.username).to.eql(username);



    const CheckAdminresponse = await request
      .get("/users/checkadmin")
      .set('Authorization', 'Bearer ' + token)
      .send();
    
      expect(CheckAdminresponse.status).to.eql(200);
      expect(CheckAdminresponse.body.Error).to.eql("Error: User is missing [user:admin] privilege");
  });
});



describe("GET/POST /api/v2/passphrase", function () {
  it("Creates and save a passphrase and then export it to a pdf", async function () {
    const authResponse = await request
      .post("/login")
      .send({ username: "test", password: "test" });

      const token = authResponse.body.token;

      const response = await request
      .post("/passphrase")
      .set('Authorization', 'Bearer ' + token)
      .send({ passphrase: "69815b5e677e6c6e67466b52537a4867", reminder: "test1" });


      expect(response.status).to.eql(200);


      const responsePdf = await request
      .post("/export")
      .set('Authorization', 'Bearer ' + token)
      .send({ 
          data: "W3sicGFzc3BocmFzZSI6IjY5ODE1YjVlNjc3ZTZjNmU2NzQ2NmI1MjUzN2E0ODY3IiwicmVtaW5kZXIiOiJ0ZXN0In1d",
          password: "test",
          username: "test"
      });

      expect(responsePdf.status).to.eql(200);

      const pdfResult = responsePdf.body;

      expect(pdfResult.toString()).to.include("%PDF-1.3");
      expect(responsePdf.headers).to.include.keys("content-type");
      expect(responsePdf.headers["content-type"]).to.eql("application/pdf");


  });
});



describe("GET/POST /notes", function () {
  it("Creates and save a note", async function () {
    const authResponse = await request
      .post("/login")
      .send({ username: "test", password: "test" });

      const token = authResponse.body.token;

      const response = await request
      .post("/notes")
      .set('Authorization', 'Bearer ' + token)
      .send({ name: "test1", body: "test1", type: "reminder"});


      expect(response.status).to.eql(200);
      expect(response.body.type).to.eql([ 'reminder' ]);
      expect(response.body.user).to.eql("test");
      expect(response.body.body).to.eql("test1");

      const responseNote2 = await request
      .put("/notes/test1")
      .set('Authorization', 'Bearer ' + token)
      .send({ name: "test1", body: "test1newupdate"});


      expect(responseNote2.status).to.eql(200);
      expect(responseNote2.body.type).to.eql([ 'reminder' ]);
      expect(responseNote2.body.user).to.eql("test");
      expect(responseNote2.body.body).to.eql("test1newupdate");


    const responseNote3 = await request
      .delete("/notes/test1")
      .set('Authorization', 'Bearer ' + token)
      .send();

      expect(responseNote3.status).to.eql(200);
      expect(responseNote3.body.message).to.eql("Note successfully deleted");



    const responseNote4 = await request
      .post("/notes")
      .set('Authorization', 'Bearer ' + token)
      .send({ name: "test2", body: "test2"});


      expect(responseNote4.status).to.eql(200);
      expect(responseNote4.body.type).to.eql([ 'public' ]);
      expect(responseNote4.body.user).to.eql("test");
      expect(responseNote4.body.body).to.eql("test2");



      const responseNote5 = await request
      .get("/notes")
      .set('Authorization', 'Bearer ' + token)
      .send();


      expect(responseNote5.status).to.eql(200);

      const responseNote6 = await request
      .post("/notesearch")
      .set('Authorization', 'Bearer ' + token)
      .send({ search: "test2"});


      result = responseNote6.body[0]
      expect(responseNote6.status).to.eql(200);
      expect(result['type']).to.eql([ 'public' ]);
      expect(result['user']).to.eql("test");
      expect(result['name']).to.eql("test2");


      const responseNote7 = await request
      .get("/notes")
      .set('Authorization', 'Bearer ' + token)
      .send();


      expect(responseNote7.status).to.eql(200);
      // Find our note
      const note = responseNote7.body.find(n => n.name === "test2");
      expect(note).to.exist;
      expect(note.name).to.eql("test2");

  });
});
