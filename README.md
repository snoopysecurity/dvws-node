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

The application now includes 50 guided challenges across REST, GraphQL, SOAP, XML-RPC, and browser workflows. The challenge guide has endpoint details, example requests, and mitigation notes: [open CHALLENGES.md](CHALLENGES.md).

Coverage includes:

* Injection: SQL, NoSQL, XPath, LDAP, XML/SOAP, OS command, server-side template injection, and unsafe YAML deserialization.
* Authentication and authorization: weak and misused JWTs, missing rate limits, user enumeration, IDOR, horizontal and vertical access-control flaws, mass assignment, and recovery/session issues.
* Browser and cross-origin issues: XSS, CSRF, CORS misconfiguration, JSONP data exposure, cookie security behavior, and cross-site WebSocket hijacking.
* Data and file handling: sensitive data exposure, path traversal, unrestricted uploads, GraphQL file writes, XXE, XML bombs, and undocumented TRACE diagnostics.
* API and business logic: hidden functionality, excessive page sizes, legacy login behavior, GraphQL introspection/batching, SSRF, open redirects, and log pollution.

The profile area also contains account recovery, session management, notification preferences and inbox, cross-origin browser demonstrations, and XML import/export exercises.

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
