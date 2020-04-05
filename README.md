# dvws-node
Damn Vulnerable Web Service is a Damn Vulnerable Insecure API/Web Service. This is a replacement for https://github.com/snoopysecurity/dvws


This vulnerable API/Web Service contains the following vulnerabilities:

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


## Set Up Instructions

**Node and NPM is needed to run dvws-node**

Tested on:
* node v10.19.0
* npm 6.13.7
* mongodb 4.0.4


Set up a mongoDB environment to listen on port `27017`. Docker can be used to quickly set this up. 

```
docker run -d -p 27017-27019:27017-27019 --name mongodb mongo:4.0.4
```

Git clone the DVWS Repository 

```
git clone https://github.com/snoopysecurity/dvws-node.git
```

Change directory to DVWS

```
cd dvws-node
```

npm install all dependencies

```
npm install  
```

To start the application/API, run (sudo privileges is needed to bind to ports)

```
npm run dvws

```

Within your /etc/hosts file, ensure localhost resolves to dvws.local. This ensures URLs from swagger is resolved correctly (optional)

```
127.0.0.1    dvws.local
```


## To Do
* REST API SQL Injection
* XML Bomb Denial-of-Service
* XPATH Injection
* XML-RPC User Enumeration
* API Endpoint Brute Forcing Challenges
* XML External Entity Injection
* CSV Injection
* Path Traversal 
* Same Origin Method Execution
* OS Command Injection
* Web Socket Security
* Type Confusion
* Unsafe Deserialization  
* LDAP Injection
* JSON Hijacking
* SOAP Injection
* XML Injection

### Other Tasks To Complete:
* Dockerize DVWS
* Write Challenge Solution Wiki
* Default Error Handling Pages
