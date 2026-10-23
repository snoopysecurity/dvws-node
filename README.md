[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-Ready--to--Code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/snoopysecurity/dvws-node) 
![Node.js Version](https://img.shields.io/badge/node-v22-green)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?logo=docker&logoColor=white)
![Security](https://img.shields.io/badge/Security-Intentionally%20Vulnerable-red)


# dvws-node
DVWS-Node is an intentionally insecure web application for learning how to find security flaws. It includes a browser interface and several ways for software and security tools to communicate with its server: REST, GraphQL, SOAP, and XML-RPC. The exercises cover common flaws in these interfaces and the application behind them. This project replaces [DVWS](https://github.com/snoopysecurity/dvws).

![DVWS](https://github.com/snoopysecurity/Public/blob/master/archived-docs/dvws/dvws.png)

## What do API and web service mean?

An **API** is a way for one program to ask another program for data or an action. A **web service** provides those functions over a network. The terms often overlap. This project offers several formats for sending those requests:

| Interface | In simple terms | Example path |
|---|---|---|
| REST | Requests to URLs, commonly using JSON | `/api/v2/users` |
| GraphQL | A request that names the data it wants | `/graphql` |
| SOAP | A formal XML-based request format | `/dvwsuserservice` |
| XML-RPC | XML requests that call named methods | `/xmlrpc` |

The browser interface is for people; these interfaces let the browser or other programs communicate with the server. See [CHALLENGES.md](CHALLENGES.md) for exercises and example requests.

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

## Set Up Instructions

### Manual

**Node and NPM is needed to run dvws-node**

Requires Node.js 22 and npm. The repository includes an `.nvmrc` for Node version managers.


Set up a mongoDB environment to listen on port `27017`. Docker can be used to quickly set this up. 

```
docker run -d -p 27017:27017 --name dvws-mongo mongo:4.0.4
```

Create a MySQL database which listens of port `3306` Docker can be used as follows

```
docker run -p 3306:3306 --name dvws-mysql -e MYSQL_ROOT_PASSWORD=mysecretpassword -e MYSQL_DATABASE=dvws_sqldb -d mysql:8
```

Git clone the DVWS Repository 

```
git clone https://github.com/snoopysecurity/dvws-node.git
```

Change directory to DVWS

```
cd dvws-node
```

Use Node.js 22 (the version used by the Docker image), then install the dependencies:

```
npm install
```



Set the database connection values in `.env` if your MongoDB or MySQL instances are not using the defaults, then seed the database:

```
node scripts/seed-database.js
```

Start the application and API:

```
npm start
```

The server uses port 80 by default. Set `EXPRESS_JS_PORT` in `.env` to a port above 1024 if you do not want to run it with elevated privileges.

Within your /etc/hosts file, ensure localhost resolves to dvws.local. This ensures URLs from swagger is resolved correctly (optional)

```
127.0.0.1    dvws.local
```

### Docker Compose

If Docker Compose is installed, start the app and its database services with:

Clone DVWS

```
git clone https://github.com/snoopysecurity/dvws-node.git
```
Change directory to dvws-node 

```
cd dvws-node
```
Start the services
```
docker compose up --build
```
This starts DVWS with its MongoDB and MySQL services. For the optional two-origin HTTPS browser exercises, configure local certificates and hostnames as described in [the TLS setup section of the challenge guide](CHALLENGES.md#41-cookie-security-and-cross-site-behavior), then run:

```sh
docker compose -f docker-compose.yml -f docker-compose.tls.yml up --build
```

If the DVWS web service doesn't start because of delayed MongoDB or MySQL setup, then increase the value of environment variable : `WAIT_HOSTS_TIMEOUT`



## Solutions
* [DVWS-Node challenge guide](CHALLENGES.md)

The guide includes password and session exercises, notification inbox and preferences, and cross-origin browser demonstrations. The cross-origin cookie and WebSocket exercises require the optional HTTPS setup; the default HTTP setup supports ordinary same-origin development.



## Any Questions

Open a GitHub Issue :)
