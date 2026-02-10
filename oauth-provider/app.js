const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

const PORT = 5000;

// In-memory store
const codes = {};
const accessTokens = {};

// Helper to parse cookies
function parseCookies(req) {
    const list = {};
    const rc = req.headers.cookie;
    rc && rc.split(';').forEach(function(cookie) {
        const parts = cookie.split('=');
        try {
            list[parts.shift().trim()] = decodeURIComponent(parts.join('='));
        } catch (e) {
            // Ignore invalid encoding
        }
    });
    return list;
}

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Logout
app.get('/logout', (req, res) => {
    res.clearCookie('mock_session');
    const returnTo = req.query.return_to || '/login';
    res.redirect(returnTo);
});

// Login Page
app.get('/login', (req, res) => {
    const returnTo = req.query.return_to || '/';
    res.send(`
        <html>
        <head><title>Mock Identity Provider</title></head>
        <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
            <h1>Mock Identity Provider</h1>
            <p>Login to continue</p>
            <form method="POST" action="/login">
                <input type="hidden" name="return_to" value="${returnTo}" />
                <div style="margin-bottom: 10px;">
                    <input type="text" name="username" placeholder="Username (e.g. admin)" required style="padding: 10px; width: 300px;" />
                </div>
                <div style="margin-bottom: 10px;">
                    <input type="text" name="email" placeholder="Email (e.g. admin@internal.dvws)" required style="padding: 10px; width: 300px;" />
                </div>
                <div style="margin-bottom: 10px;">
                    <input type="password" name="password" placeholder="Password (any)" required style="padding: 10px; width: 300px;" />
                </div>
                <button type="submit" style="padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer;">Login</button>
            </form>
            <p style="color: #666; font-size: 0.9em;">Tip: Use username <b>admin</b> to simulate an attack.</p>
        </body>
        </html>
    `);
});

// Handle Login
app.post('/login', (req, res) => {
    const { username, email, return_to } = req.body;
    
    // Create user object
    const user = {
        sub: Math.random().toString(36).substring(7),
        name: username,
        preferred_username: username,
        email: email,
        picture: "https://via.placeholder.com/150"
    };

    // Set cookie (insecure for mock)
    const userStr = JSON.stringify(user);
    res.cookie('mock_session', userStr, { httpOnly: true });
    
    res.redirect(return_to);
});

// Authorize Endpoint
app.get('/authorize', (req, res) => {
    const { client_id, redirect_uri, response_type, state, scope } = req.query;

    console.log(`[OAuth] Authorize request: client_id=${client_id}, redirect_uri=${redirect_uri}, scope=${scope}`);
    
    // Check login
    const cookies = parseCookies(req);
    if (!cookies.mock_session) {
        return res.redirect(`/login?return_to=${encodeURIComponent(req.originalUrl)}`);
    }

    let user;
    try {
        user = JSON.parse(cookies.mock_session);
    } catch (e) {
        console.error("Failed to parse session cookie:", cookies.mock_session);
        return res.redirect(`/login?return_to=${encodeURIComponent(req.originalUrl)}`);
    }

    // Validate Redirect URI (Weak Validation)
    // Vulnerability: Allows 'localhost' subdomains or attacker domains if they start with localhost
    
    const ALLOWED_BASE = "http://localhost:9090";
    
    // Common vuln: White-listing "localhost" but not the port.
    if (!redirect_uri || !redirect_uri.includes("localhost")) {
         return res.status(400).send('Invalid redirect_uri. Must be a localhost URL.');
    }
    
    // NOTE: To allow the Open Redirect exploit to http://localhost:6666, 
    // the above logic (includes "localhost") permits it. 
    // This simulates a "Developer allowed localhost for dev testing" vulnerability.

    if (response_type !== 'code' && response_type !== 'token') {
        return res.status(400).send('Unsupported response_type');
    }

    // Consent Page Logic
    if (req.query.confirm !== 'true') {
        // Construct the confirm URL by appending confirm=true to existing query params
        // We can't easily use URLSearchParams here without importing 'url' module or doing string manipulation
        // Simple string manipulation:
        const hasQuery = req.url.includes('?');
        const confirmUrl = req.url + (hasQuery ? '&' : '?') + 'confirm=true';
        const logoutUrl = `/logout?return_to=${encodeURIComponent(req.originalUrl)}`;
        
        return res.send(`
            <html>
            <head><title>Consent Required</title></head>
            <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
                <h1>Authorize Application</h1>
                <p>You are currently logged in as <b>${user.username}</b> (${user.email}).</p>
                <p>The application <b>${client_id}</b> is requesting access.</p>
                <p>Scope: <code>${scope || 'openid'}</code></p>
                <div style="margin-top: 20px;">
                    <a href="${confirmUrl}" style="padding: 10px 20px; background: #28a745; color: white; text-decoration: none; border-radius: 5px;">Continue as ${user.username}</a>
                    <br><br>
                    <a href="${logoutUrl}" style="color: #dc3545;">Switch User / Logout</a>
                </div>
            </body>
            </html>
        `);
    }

    // Auto-approve consent since we are logged in AND confirmed
    
    if (response_type === 'token') {
        // Implicit Flow: Return token in fragment
        const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        accessTokens[token] = {
            user: user,
            scope: scope || 'openid'
        };
        
        let redirectUrl = `${redirect_uri}#access_token=${token}&token_type=Bearer&expires_in=3600`;
        if (state) {
            redirectUrl += `&state=${state}`;
        }
        return res.redirect(redirectUrl);
    }

    // Code Flow
    const code = Math.random().toString(36).substring(7);
    codes[code] = {
        client_id,
        redirect_uri,
        user: user,
        scope: scope || 'openid'
    };

    let redirectUrl = `${redirect_uri}?code=${code}`;
    if (state) {
        redirectUrl += `&state=${state}`;
    }

    res.redirect(redirectUrl);
});

// Token Endpoint
app.post('/token', (req, res) => {
    const { code, client_id, client_secret, grant_type, redirect_uri } = req.body;
    
    console.log(`[OAuth] Token request: code=${code}`);

    if (grant_type !== 'authorization_code') {
        return res.status(400).json({ error: 'unsupported_grant_type' });
    }

    if (!codes[code]) {
        return res.status(400).json({ error: 'invalid_code' });
    }

    const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    accessTokens[token] = {
        user: codes[code].user,
        scope: codes[code].scope
    };
    
    const grantedScope = codes[code].scope;

    // Invalidate code
    delete codes[code];

    res.json({
        access_token: token,
        token_type: 'Bearer',
        expires_in: 3600,
        id_token: "mock_id_token",
        scope: grantedScope
    });
});

// UserInfo Endpoint
app.get('/userinfo', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'no_token' });

    const token = authHeader.split(' ')[1];
    const tokenData = accessTokens[token];
    if (!tokenData) return res.status(401).json({ error: 'invalid_token' });

    console.log(`[OAuth] UserInfo request for token=${token}`);
    res.json(tokenData.user);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mock OAuth Provider running on port ${PORT}`);
});
