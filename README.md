[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-Ready--to--Code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/snoopysecurity/dvws-node) 

# dvws-node
Damn Vulnerable Web Service is a Damn Vulnerable Insecure API/Web Service. This is a replacement for https://github.com/snoopysecurity/dvws

![DVWS](https://snoopysecurity.github.io/assets/dvws.png)



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
* Cross-Site Request Forgery (CSRF)
* JSON Hijacking
* SQL Injection
* XML External Entity Injection
* Command Injection
* Postmessage Security (JavaScript Security)
* Prototype Pollution (JavaScript Security)
* XPATH Injection
* XML-RPC User Enumeration

## Set Up Instructions

### Docker Compose

If you have docker compose installed on your system, all you need to execute is : `docker-compose up`

If the DVWS web service doesn't start because of delayed MongoDB or MySQL setup, then increase the value of environment variable : `WAIT_HOSTS_TIMEOUT`

### Manual

**Node and NPM is needed to run dvws-node**

Tested on:
* node v10.19.0
* npm 6.13.7
* mongodb 4.0.4


Set up a mongoDB environment to listen on port `27017`. Docker can be used to quickly set this up. 

```
docker run -d -p 27017-27019:27017-27019 --name dvws-mongo mongo:4.0.4
```

Create a MySQL database which listens of port `3306` Docker can be used as follows

```
docker run -p 3306:3306 --name dvws-mysql -e MYSQL_ROOT_PASSWORD=mysecretpassword -d mysql:5.7
```

Git clone the DVWS Repository 

```
git clone https://github.com/snoopysecurity/dvws-node.git
```

Change directory to DVWS

```
cd dvws-node
```

npm install all dependencies  (build from source is needed for `libxmljs`, you might also need install libxml depending on your OS: `sudo apt-get install -y libxml2 libxml2-dev`)


```
npm install --build-from-source
```



Run the startup script which create some test data

```
node startup_script.js
```

To start the application/API, run (**sudo privileges** is needed to bind to ports)

```
sudo npm run dvws
```

Within your /etc/hosts file, ensure localhost resolves to dvws.local. This ensures URLs from swagger is resolved correctly (optional)

```
127.0.0.1    dvws.local
```

## Solutions
* [DVWS Solutions Wiki](https://github.com/snoopysecurity/dvws-node/wiki)



## To Do
* XML Bomb Denial-of-Service
* API Endpoint Brute Forcing Challenges
* CSV Injection
* Path Traversal 
* Same Origin Method Execution
* Web Socket Security
* Type Confusion
* Unsafe Deserialization  
* LDAP Injection
* SOAP Injection
* XML Injection
* GRAPHQL Security
* CRLF Injection


### Other Tasks To Complete:
* Complete writing Challenge Solution Wiki


## Any Questions

Open a GitHub Issue :) 
