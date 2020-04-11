# dvws-node
Damn Vulnerable Web Service is a Damn Vulnerable Insecure API/Web Service. This is a replacement for https://github.com/snoopysecurity/dvws

![DVWS](https://snoopysecurity.github.io/assets/dvws.png)



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
* JSON Hijacking
* REST API SQL Injection



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

npm install all dependencies

```
npm install  
```

Run the startup script which create some test data

```
node startup_script.js
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
* SOAP Injection
* XML Injection

### Other Tasks To Complete:
* Dockerize DVWS
* Write Challenge Solution Wiki
* Default Error Handling Pages


## Any Questions

Open a GitHub Issue :) 
