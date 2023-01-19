[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-Ready--to--Code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/snoopysecurity/dvws-node) 

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
* Client Side Template Injection

## Set Up Instructions

### Manual (Preferred Method)

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
* Cross-Site Request Forgery (CSRF)
* XML Bomb Denial-of-Service
* API Endpoint Brute Forcing
* Web Socket Security
* Type Confusion
* LDAP Injection
* SOAP Injection
* XML Injection
* GRAPHQL Denial Of Service
* CRLF Injection
* GraphQL Injection
* Webhook security

## Dokumentacja

1. Hashowanie haseł
Hasła są zaszyfrowane
![password hashing](resources/password.png)

2. User Enumeration
* tworze uzytkownika
![new user](resources/create-user.png)
* sprawdzam jaka jest odpowiedź serwera gdy on istnieje
![test if user exist](resources/test-user.png)


* sprawdzenie uzytkownika moze odbywac sie tez za pomoca xml
![test if user exist](resources/test-user1.png)

    mając taką odpowiedź, hacker moze teraz za pomocą techniki brute force sforsować hasło uytkownika

3. NoSQL Injection - pozyskanie danych za pomocą zapytania do bazy
    Dzięki temu mozna było pozyskać wszystkie dostępne notatki, nawet te, które nie są publiczne.
![nosql](resources/nosql.png)

4. Insecure Direct Object Reference
![idor](resources/idor.png)

5. Mass Assignment

Atak polega na przypisywaniu wartości zmiennej po stronie serwera.
Przykłądem jest tworzenie użytkownika bez uprawnień adminstratora. 
W tym przypadku defaultowy obiekt użytkownika zostaje utworzony ze zmienną admin=false.
Atak będzie polegał na narzuceniu zmiennej admin=true i jednoczesnym przejęciu uprawnień administratora.
![mass-assignment](resources/mass-assignment.png)
![mass-assignment2](resources/mass-assignment2.png)
![mass-assignment3](resources/mass-assignment3.png)

6. XML Cross-Site Scripting (XSS)
![xss](resources/xss.png)
![xss2](resources/xss2.png)
![xss3](resources/xss3.png)

7. Hidden API Functionality Exposure
    Po uruchomieniu swaggera widać rózne dostępne endpointy. Wpisując w przeglądarkę po kolei kazdy endpoint, sprawdzane jest, czy sa on zabezpieczone.

![api](resources/api.png)


8. SQL Injection
Ataki SQL Injection są niestety bardzo powszechne, a wynika to z dwóch czynników:
znaczne rozpowszechnienie luk SQL Injection oraz atrakcyjność celu (tj. baza danych zazwyczaj zawiera wszystkie interesujące/krytyczne dane dla Twojej aplikacji). Wstrzyknięcia SQL są wprowadzane, gdy twórcy oprogramowania tworzą dynamiczne zapytania do bazy danych zbudowane z konkatenacji łańcuchów, które obejmują dane wejściowe wprowadzone przez użytkownika. Może to zostać wykorzystane do przeglądania, modyfikowania lub usuwania danych aplikacji, co wcześniej nie było możliwe, lub do powodowania trwałych zmian w zawartości lub zachowaniu aplikacji.

Uniknięcie błędów iniekcji SQL jest proste. Deweloperzy muszą albo: 
a) przestać pisać dynamiczne zapytania z konkatenacją łańcuchów;
i/lub
b) zapobiegać wpływaniu danych wejściowych użytkownika, które zawierają złośliwy kod SQL, na logikę wykonywanego zapytania.

Poniżej przeprowadzono atak polegający na wstrzyknięciu w URL dodatkowego znaku ' po nazwie użytkownika.
Przed atakiem:


![sql1_1](resources/sql1_1.png)

Atak:

![sql_injection1](resources/sql_injection1.png)


Po ataku:

![sql_injection2](resources/sql_injection2.png)


Kolejny atak polegał na podmienieniu nazwy użytkownika na frazę '1'='1
![sql4](resources/sql4.png)
![sql5](resources/sql5_2.png)




9. Information Disclosure
* uzytkownikowi po zalogowaniu zwracane sa zszyfrowane haslo




10. Command Injection


15. Vertical Access Control

Pionowa eskalacja uprawnień jest możliwa, jeśli klucz kontrolowany przez użytkownika jest w rzeczywistości  flagą wskazującą status administratora, umożliwiając atakującemu uzyskanie dostępu administracyjnego.

Wiele wywołań interfejsu API, które może wykonać tylko administrator w obszarze administracyjnym, może wywołać użytkownik bez uprawnień administratora.

Po zalogowaniu na zwykłego użytkownika, wchodzimy w panel z danymi dla admina. Rozpoczyna się sprawdzanie uprawnień:
![VAC1_](resources/VAC1_.png)

Atak polega na podmienieniu URL:

![VAC2_](resources/VAC2_.png)

Użytkownik bez uprawnień administratora uzyskał dostęp do panelu admina:
![VAC3](resources/VAC3.png)

Sprawdzenie możliwość korzystania z panelu i wyszukanie innego użytkownika:

![VAC4](resources/VAC4.png)
![VAC5](resources/VAC5.png)

16. Horizontal Access Control

Możliwa pozioma eskalacja uprawnień (jeden użytkownik może przeglądać/modyfikować informacje innego użytkownika.
Możliwe jest przeglądanie haseł utworzonych przez użytkownika, jeśli znasz nazwę użytkownika
Możliwe jest przeprowadzenie ataku nie tylko za pomoca podmiany nazwy użytkownika, ale także podmiany ID

Utworzenie rekordu danych dla użytkownika z uprawnieniami administratora.

![HAC1](resources/HAC1.png)

Zalogowanie na zwykłego użytkownika Marcin oraz podmiana nazwy użytkownika na tego z uprawnieniami administratora.

![HAC2](resources/HAC2.png)

Dostęp do passphare administratora :

![HAC3](resources/HAC3.png)

17. Open Redirect
18. Path Traversal
19. Unsafe Deserialization
20. Sensitive Data Exposure