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

## Tests

The vulnerability tests are intentionally expected to pass when the vulnerable behaviour is present. See [`test/README.md`](test/README.md) for the commands and prerequisites.

## Further reading

- [Challenge guide](CHALLENGES.md)
- [Frontend README](frontend/README.md)

Questions and bug reports are welcome as [GitHub issues](https://github.com/snoopysecurity/dvws-node/issues).
