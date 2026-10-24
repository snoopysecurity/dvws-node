require('dotenv').config();
const assert = require('assert');
const crypto = require('crypto');
const request = require('supertest')(require('./helpers/base-url'));

describe('GraphQL login batching and request rate limit', function () {
  it('blocks separate login requests after ten but accepts more guesses in one batch', async function () {
    const username = `graphql_batch_${Date.now()}`;
    const password = 'Batch123!';
    assert.strictEqual((await request.post('/api/v2/users').send({ username, password })).status, 201);
    const [third, fourth] = crypto.randomBytes(2);
    const singleIp = `198.18.${third}.${fourth}`;
    const batchIp = `198.19.${third}.${fourth}`;
    const operation = (guess) => ({
      query: `mutation { userLogin(username: ${JSON.stringify(username)}, password: ${JSON.stringify(guess)}) { username password token } }`
    });

    for (let index = 0; index < 10; index++) {
      const attempt = await request.post('/graphql').set('X-Forwarded-For', singleIp)
        .send(operation(`wrong-${index}`));
      assert.strictEqual(attempt.status, 200);
      assert.ok(attempt.body.errors?.length, 'wrong password should be rejected by the real login resolver');
    }
    const blocked = await request.post('/graphql').set('X-Forwarded-For', singleIp)
      .send(operation(password));
    assert.strictEqual(blocked.status, 429);

    const guesses = Array.from({ length: 10 }, (_, index) => operation(`wrong-${index}`));
    guesses.push(operation(password));
    const batched = await request.post('/graphql').set('X-Forwarded-For', batchIp).send(guesses);
    assert.strictEqual(batched.status, 200);
    assert.strictEqual(batched.body.length, 11);
    assert.ok(batched.body.slice(0, 10).every((result) => result.errors?.length));
    const token = batched.body[10].data?.userLogin?.token;
    assert.ok(token, `a matching password in the batch should issue an application token: ${JSON.stringify(batched.body[10])}`);
    assert.match(batched.body[10].data.userLogin.password, /^\$2[aby]\$/);
    const protectedResponse = await request.get('/api/v2/notes').set('Authorization', `Bearer ${token}`);
    assert.strictEqual(protectedResponse.status, 200);
  });
});
