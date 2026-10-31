[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-Ready--to--Code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/snoopysecurity/dvws-node)
![Node.js Version](https://img.shields.io/badge/node-v22-green)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?logo=docker&logoColor=white)
![Security](https://img.shields.io/badge/Security-Intentionally%20Vulnerable-red)

# DVWS-Node

DVWS-Node is a deliberately vulnerable web application for practising API and web-service security testing. It includes a browser UI and REST, GraphQL, SOAP, and XML-RPC interfaces. The vulnerabilities are intentional; do not expose this project to an untrusted network.

It is the successor to [DVWS](https://github.com/snoopysecurity/dvws). The hands-on exercises are in the [challenge guide](CHALLENGES.md).

## Interfaces

| Interface | Path |
|---|---|
| REST | `/api/v1/*`, `/api/v2/*` |
| GraphQL | `/graphql` |
| SOAP | `/dvwsuserservice` |
| XML-RPC | `/xmlrpc` |
| Swagger | `/api-docs` |

The exercises cover injection, broken authentication and access control, unsafe file handling, browser attacks, GraphQL flaws, and several business-logic bugs.

## Run it with Docker Compose

```sh
git clone https://github.com/snoopysecurity/dvws-node.git
cd dvws-node
docker compose up --build
```

This starts the application, MongoDB, and MySQL. If startup fails because a database is still coming up, increase `WAIT_HOSTS_TIMEOUT`.

The app is available on port 80 by default. The optional HTTPS setup is needed for the cross-origin browser exercises:

```sh
docker compose -f docker-compose.yml -f docker-compose.tls.yml up --build
```

See the [TLS setup in the challenge guide](CHALLENGES.md#41-cross-site-request-forgery-through-the-login-cookie) for local certificates and hostnames.

## Run it manually

You need Node.js 22, MongoDB on port 27017, and MySQL on port 3306. Docker can start the databases:

```sh
docker run -d -p 27017:27017 --name dvws-mongo mongo:4.0.4
docker run -d -p 3306:3306 --name dvws-mysql \
  -e MYSQL_ROOT_PASSWORD=mysecretpassword \
  -e MYSQL_DATABASE=dvws_sqldb mysql:8
```

Then install, seed, and start the app:

```sh
npm install
node scripts/seed-database.js
npm start
```

Set the database values in `.env` if your services use different settings. The server listens on port 80; set `EXPRESS_JS_PORT` to an unprivileged port if needed.

For Swagger links, you can add this entry to `/etc/hosts`:

```text
127.0.0.1 dvws.local
```

## Security issues covered

The application includes guided exercises across REST, GraphQL, SOAP, XML-RPC, and browser workflows. See the [challenge guide](CHALLENGES.md) for endpoint details, example requests, and mitigation notes.

* SQL Injection
* NoSQL Injection
* OS Command Injection
* XML External Entity Injection (XXE)
* XML Bomb (Denial of Service)
* Server-Side Request Forgery (SSRF)
* Insecure Deserialization (RCE)
* XPath Injection
* LDAP Injection
* Path Traversal
* SOAP Injection
* XML Injection (Profile Export)
* XML Injection (Profile Import / Mass Assignment)
* Mass Assignment (User Registration)
* IDOR (Insecure Direct Object Reference)
* Broken Authentication (JWT `none` Algorithm)
* JWT Secret Key Brute Force
* JWT JKU Key Source Trust
* JWT KID Path Traversal
* Vertical Access Control (Privilege Escalation)
* Horizontal Access Control
* Open Redirect
* Cross-Site Scripting (XSS)
* Cross-Site Request Forgery (CSRF)
* CORS Misconfiguration
* CRLF Injection / Log Pollution
* User Enumeration
* Information Disclosure
* Sensitive Data Exposure (Password Hashes)
* Prototype Pollution
* API Endpoint Brute Forcing (Missing Rate Limit)
* HTTP Method Confusion (State Change Through GET)
* Ignored `Accept` Headers and Content-Type Confusion
* Credentials in URLs and Base64 Mistaken for Encryption
* HTTP Method Override Bypass
* Shared Caching of Authenticated Reports
* Inconsistent Request Format Handling
* Resource Store: Get an Item for Free
* Resource Store: Increase Your Balance by 1,000 Credits
* Rate Limit Bypass via `X-Forwarded-For`
* Hidden API Functionality Exposure
* GraphQL Introspection
* GraphQL Access Control Issues
* GraphQL Arbitrary File Write
* GraphQL Batching Brute Force
* GraphQL Sensitive Data Exposure
* GraphQL Alias Amplification
* Missing Security Headers
* Unrestricted File Upload
* Role-Based Profile Data Exposure
* Account Recovery IDOR Chain
* Session Revocation After Password Change
* Cross-Site Request Forgery Through the Login Cookie
* JSONP Cross-Origin Profile Sharing
* Cross-Site WebSocket Hijacking
* Server-Side Template Injection
* Unsafe YAML Supplier Import
* Cross-Customer Monthly Statement Path Traversal
* Notification Preference Mass Assignment
* Undocumented TRACE Diagnostics
* Legacy Login Skips Password Verification
* Excessive Activity Report Page Size
* Timing Attacks

## Tests

The vulnerability tests are intentionally expected to pass when the vulnerable behaviour is present. See [`test/README.md`](test/README.md) for the commands and prerequisites.

## Further reading

- [Challenge guide](CHALLENGES.md)
- [Frontend README](frontend/README.md)

Questions and bug reports are welcome as [GitHub issues](https://github.com/snoopysecurity/dvws-node/issues).
