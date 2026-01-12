# DVWS-Node Vulnerability Test Suite

This test suite validates that all intentional security vulnerabilities remain present after dependency updates.

## Running Tests

### Prerequisites
- MongoDB running on localhost:27017
- MySQL running on localhost:3306
- Application running on port 80 (http://127.0.0.1)

### Start the Application
```bash
npm start
```

### Run All Tests
```bash
# Run all tests (original + vulnerability tests)
npm run test:all

# Run only vulnerability tests
npm run test:vulnerabilities

# Run original functional tests
npm test
```

## Vulnerability Coverage

The test suite validates the following vulnerabilities:

### 1. **NoSQL Injection**
- Location: `controllers/notebook.js` - `search_note()` and `display_all()`
- Payload: `$where` clause with unsanitized user input
- Test: Attempts injection via note search

### 2. **SQL Injection**
- Location: `controllers/passphrase.js` and `graphql/schema.js`
- Payload: Raw SQL queries with string concatenation
- Test: Attempts SQL injection in passphrase creation

### 3. **Command Injection**
- Location: `controllers/notebook.js` - `get_sysinfo()`
- Payload: User input directly passed to `exec()`
- Test: Attempts command injection via sysinfo endpoint

### 4. **XPath Injection**
- Location: `controllers/notebook.js` - `get_release()`
- Payload: User input concatenated into XPath query
- Test: Attempts XPath injection via release parameter

### 5. **XXE (XML External Entity)**
- Location: `controllers/notebook.js`
- Issue: XML parsed without disabling external entities
- Test: Verifies XML parsing occurs without restrictions

### 6. **SSRF (Server-Side Request Forgery)**
- Location: `rpc_server.js` - `CheckUptime` method
- Issue: `needle.get()` accepts user-controlled URLs
- Test: Code review confirmation

### 7. **Path Traversal**
- Location: `controllers/storage.js` - `fetch()` and file operations
- Issue: File paths constructed from user input
- Test: Attempts path traversal in file fetch

### 8. **Mass Assignment**
- Location: `controllers/users.js` - `add()`
- Issue: `new User(req.body)` accepts all fields
- Test: Attempts to create admin user via mass assignment

### 9. **Insecure Direct Object Reference (IDOR)**
- Location: `controllers/notebook.js` - note access methods
- Issue: No ownership validation on note access
- Test: Attempts to access notes without authorization check

### 10. **Open Redirect**
- Location: `controllers/users.js` - `logout()`
- Issue: Redirects to user-controlled domain
- Test: Verifies redirect without validation

### 11. **JWT Weak Secret / Algorithm Confusion**
- Location: Multiple files with JWT verification
- Issues:
  - Weak secret: `JWT_SECRET=access`
  - Algorithm confusion: `algorithms: ["HS256", "none"]`
- Test: Validates weak secret and algorithm options

### 12. **CORS Misconfiguration**
- Location: `app.js`
- Issue: `origin: true` and `credentials: true` allow all origins
- Test: Verifies permissive CORS headers

### 13. **Information Disclosure**
- Location: `controllers/notebook.js` - `get_info()`
- Issue: Exposes environment variables and system information
- Test: Verifies sensitive data exposure

### 14. **GraphQL Introspection Enabled**
- Location: `app.js`
- Issue: `introspection: true` and `playground: true`
- Test: Code review confirmation

### 15. **GraphQL Arbitrary File Write**
- Location: `graphql/schema.js` - `updateUserUploadFile` mutation
- Issue: User-controlled file path with minimal validation
- Test: Code review confirmation

### 16. **GraphQL Batching / Brute Force**
- Location: `app.js`
- Issue: `allowBatchedHttpRequests: true`
- Test: Code review confirmation

### 17. **Client-Side Template Injection**
- Location: `public/search.html`
- Issue: AngularJS 1.x with user input in templates
- Test: Code review confirmation

### 18. **Unsafe Deserialization**
- Location: `controllers/passphrase.js` - `export()`
- Issue: `node-serialize.unserialize()` on user data
- Test: Attempts deserialization attack

### 19. **Sensitive Data Exposure**
- Location: `graphql/schema.js` and `controllers/users.js`
- Issue: Password hashes returned in responses
- Test: Code review confirmation

### 20. **XML-RPC User Enumeration**
- Location: `rpc_server.js`
- Issue: Exposed methods via `system.listMethods`
- Test: Code review confirmation

### 21. **Hidden API Functionality**
- Location: Various endpoints
- Issue: Undocumented endpoints accessible
- Test: Verifies access to "hidden" endpoints

### 22. **Vertical Access Control**
- Location: JWT-based admin checks
- Issue: Permissions can be manipulated
- Test: Code review confirmation

### 23. **Horizontal Access Control**
- Location: `controllers/notebook.js`
- Issue: Can view other users' public data
- Test: Verifies access to all public notes

### 24. **JSON Hijacking**
- Location: Multiple endpoints returning arrays
- Issue: Top-level JSON arrays vulnerable to hijacking
- Test: Verifies array responses

## Test Results Interpretation

- ✅ **Passing tests** indicate vulnerabilities are still present (desired for CTF)
- ❌ **Failing tests** may indicate a vulnerability was accidentally fixed
- Some tests use code review confirmation where dynamic testing isn't feasible

## Notes

- These vulnerabilities are **intentional** for security training purposes
- Do not deploy this application in production environments
- Tests require the application to be running before execution
- Some tests validate code patterns rather than exploit behavior
