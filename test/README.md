# DVWS-Node tests

These tests check that the lab's intentional vulnerabilities are still present after code or dependency changes. A passing vulnerability test usually means the vulnerable behaviour is still there.

## Requirements

- MongoDB on `localhost:27017`
- MySQL on `localhost:3306`
- DVWS-Node running at `http://127.0.0.1` on port 80

Start the application with:

```sh
npm start
```

Run the suites with:

```sh
npm run test:all              # functional and vulnerability tests
npm run test:vulnerabilities  # vulnerability tests only
npm test                      # original functional tests
```

## What is covered

The tests exercise or review the following areas:

- SQL, NoSQL, LDAP, XPath, XML, SOAP, command, and template injection
- XXE, XML entity expansion, unsafe deserialization, YAML function tags, and prototype pollution
- SSRF, path traversal, arbitrary file writes, and unrestricted uploads
- JWT weaknesses, missing password checks, account recovery flaws, and session handling
- IDOR, horizontal and vertical access control, mass assignment, and data exposure
- XSS, CSRF, CORS, JSONP, WebSocket origin checks, open redirects, and missing headers
- GraphQL introspection, authorization, batching, alias amplification, and data exposure
- Rate-limit bypasses, user enumeration, log pollution, hidden endpoints, timing leaks, and Resource Store logic bugs

Some tests inspect source because a live exploit is not practical. The runtime tests include:

- `test/vulnerabilities.test.js` — GraphQL aliases and missing headers
- `test/support-tickets.test.js` — ticket IDOR and UUID handling
- `test/resource-store.test.js` — negative quantities and wallet isolation
- `test/promotion-timing.test.js` — promotion timing behaviour
- `test/inspired-challenges.test.js` — monthly report traversal
- `test/jwt-key-lab.test.js` — `jku` trust and `kid` traversal

Run the promotion timing test in the web container after starting Compose:

```sh
docker compose exec web npx mocha test/promotion-timing.test.js --exit
```

## Notes

This is a training application, not a production service. Keep it isolated. A failing vulnerability test may mean that the vulnerable code was changed or that the application is not running correctly; check the test output before drawing conclusions.
