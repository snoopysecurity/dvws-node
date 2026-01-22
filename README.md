[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-Ready--to--Code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/snoopysecurity/dvws-node) 
![Node.js Version](https://img.shields.io/badge/node-v20%2B-green)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?logo=docker&logoColor=white)
![Security](https://img.shields.io/badge/Security-Intentionally%20Vulnerable-red)


# dvws-node
Damn Vulnerable Web Services is a vulnerable application with a web service and an API that can be used to learn about webservices/API related vulnerabilities.  This is a replacement for https://github.com/snoopysecurity/dvws

![DVWS](https://github.com/snoopysecurity/Public/blob/master/dvws/dvws.png)

This vulnerable application contains the following API/Web Service vulnerabilities:

* Insecure Direct Object Reference
* Horizontal Access Control Issues
* Vertical Access Control Issues
* Mass Assignment
* Cross-Site Scripting 
* NoSQL Injection
* Server Side Request Forgery
* JSON Web Token (JWT) Secret Key Brute Force
* Information Disclosure
* Hidden API Functionality Exposure
* Cross-Origin Resource Sharing Misonfiguration
* JSON Hijacking
* SQL Injection
* XML External Entity Injection (XXE)
* Command Injection
* XPATH Injection
* XML-RPC User Enumeration
* Open Redirect
* Path Traversal
* Unsafe Deserialization 
* Sensitive Data Exposure
* GraphQL Access Control Issues
* GraphQL Introspection Enabled
* GraphQL Arbitrary File Write
* GraphQL Batching Brute Force
* API Endpoint Brute Forcing
* CRLF Injection
* XML Injection
* XML Bomb Denial-of-Service
* SOAP Injection
* Cross-Site Request Forgery (CSRF)
* Rate Limit Bypass
* Client Side Template Injection

## Set Up Instructions

### Manual (Preferred Method)

**Node and NPM is needed to run dvws-node**

Tested on:
* node v20.x / v22.x
* npm 10.x


Set up a mongoDB environment to listen on port `27017`. Docker can be used to quickly set this up. 

```
docker run -d -p 27017-27019:27017-27019 --name dvws-mongo mongo:4.0.4
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

npm install all dependencies  (build from source is needed for `libxmljs`, you might also need to install libxml depending on your OS: `sudo apt-get install -y libxml2 libxml2-dev`)


```
npm install --build-from-source
```



Run the startup script which create some test data

```
node startup_script.js
```

To start the application/API, run (**sudo privileges** is needed to bind to port 80, which is the default. You can change the port in `.env` to avoid using sudo).

```
sudo npm start
```

Within your /etc/hosts file, ensure localhost resolves to dvws.local. This ensures URLs from swagger is resolved correctly (optional)

```
127.0.0.1    dvws.local
```

### Docker Compose

If you have docker compose installed on your system, all you need to execute is : 

Clone DVWS

```
git clone https://github.com/snoopysecurity/dvws-node.git
```
Change directory to dvws-node 

```
cd dvws-node
```
Start Docker
```
`docker-compose up`
```
This will start the dvws service with the backend MySQL database and the NoSQL database.

If the DVWS web service doesn't start because of delayed MongoDB or MySQL setup, then increase the value of environment variable : `WAIT_HOSTS_TIMEOUT`



## Solutions
* [DVWS Solutions Wiki](https://github.com/snoopysecurity/dvws-node/wiki)



## To Do

* Web Socket Security
* Type Confusion
* LDAP Injection
* GRAPHQL Denial Of Service
* GraphQL Injection
* Webhook security
* Parameter Pollution
* OAuth2/OIDC Flow Flaws


## Any Questions

Open a GitHub Issue :)
