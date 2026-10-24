const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const xml2js = require('xml2js');
const crypto = require('crypto');
const notifications = require('../services/notifications');
const { broadcast } = require('../services/websocket-notifications');
const { recordActivity } = require('../services/activity-events');

const connUri = process.env.MONGO_LOCAL_CONN_URL;
const User = require('../models/user');

const options = {
  expiresIn: '2d',
  issuer: 'https://github.com/snoopysecurity',
  algorithms: ["HS256", "none"],
  ignoreExpiration: true
};

// In-memory log store for login attempts (Vulnerable to Log Pollution)
const loginLogs = [];
// Deliberately vulnerable: this simulates a shared HTTP cache for the ordinary
// profile endpoint. Entries are keyed only by URL, never by the authenticated
// user, so a later caller can receive another user's profile response.
const profileResponseCache = new Map();
const PROFILE_CACHE_TTL_MS = 60 * 1000;
// The restore workflow accepts only XML produced by this server process. The
// signature covers the exact export bytes and the account that requested them.
const profileExportKey = crypto.randomBytes(32);

function profileExportSignature(username, xml) {
  return crypto.createHmac('sha256', profileExportKey).update(username).update('\n').update(xml).digest('hex');
}

function readCookie(req, name) {
  const cookies = (req.headers.cookie || '').split(';');
  const entry = cookies.find((cookie) => cookie.trim().startsWith(`${name}=`));
  if (!entry) return null;
  try { return decodeURIComponent(entry.trim().slice(name.length + 1)); }
  catch (_err) { return null; }
}

function set_cors(req,res) {
  if (req.get('origin')) {
  res.header('Access-Control-Allow-Origin', req.get('origin'))
  res.header('Access-Control-Allow-Credentials', true)
  } else {
  res.header('Access-Control-Allow-Origin', null)
  res.header('Access-Control-Allow-Credentials', true)
  }
  return res;
};

function authCookieOptions(req) {
  const httpsRequest = req.secure || req.protocol === 'https' || Boolean(req.socket && req.socket.encrypted);
  return {
    httpOnly: true,
    secure: httpsRequest,
    sameSite: httpsRequest ? 'none' : 'lax',
    path: '/'
  };
}

function setAuthCookie(req, res, token) {
  res.cookie('auth_token', token, authCookieOptions(req));
}



module.exports = {
  add: async (req, res) => {

      let result = {};
      let status = 201;
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
        const { username, password } = req.body;

        try {
          const obj = await User.findOne({username});
          if (obj != null) {
            if (obj.username) {
              res.writeHead(409, {'Content-Type': 'text/plain'});
              res.write('User ' + obj.username + ' already exists');
              res.end(); 
              return;
            } 
          }
          
          const user = new User(req.body); // document = instance of a model
          // TODO: We can hash the password here as well before we insert
          try {
            const savedUser = await user.save();
            result.status = status;
            result.user = savedUser.username;
            result.password = savedUser.password;
          } catch (err) {
            status = 500;
            result.status = status;
            result.error = err;
          }
          res.status(status).send(result);
        } catch (err) {
           // Handle findOne error
           res.status(500).send(err);
        }
  },

  checkadmin: (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    const token = req.headers.authorization.split(' ')[1]; // Bearer <token>
    const options = {
        expiresIn: '2d',
        issuer: 'https://github.com/snoopysecurity',
        permissions: ["user:admin"],
        algorithms: ["HS256", "none"],
        ignoreExpiration: true
      };

    result = jwt.verify(token, process.env.JWT_SECRET, options);
    if (result.permissions.includes('user:admin')) {
        endresult = {}
        endresult['Success'] = 'User is Admin Privileged'
        endresult['AdminURL'] = '/api/v2/users'
        endresult['User'] = result.user
        res.send(endresult);
      } else {
        endresult = {}
        endresult['Error'] = 'Error: User is missing [user:admin] privilege'
        endresult['User'] = result.user
        res.send(endresult);

      }
  },

  logout: (req, res) => {

    res.redirect("http://" + req.params.redirect);
      
  },


  login: async (req, res) => {
    const credentials = req.method === 'GET' ? req.query : req.body;
    const { username, password } = credentials;
    // The legacy client calls this "encrypted" even though it is only Base64.
    // Decoding it server-side provides no protection for the submitted secret.
    const submittedPassword = credentials.encryptedPassword
      ? Buffer.from(credentials.encryptedPassword, 'base64').toString('utf8')
      : password;
    //set_cors(req,res);
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
      let result = {};
      let status = 200;
      
      // Vulnerability: Log Pollution via CRLF Injection
      // We log the username directly without sanitization.
      // If username contains \n, it creates a fake log entry on a new line.
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || "unknown";
      loginLogs.push(`[${new Date().toISOString()}] Login attempt from IP:${ip} User:${username}`);

      try {
        const user = await User.findOne({username});
        if (user) {
            // We could compare passwords in our model instead of below as well
            try {
              const match = await bcrypt.compare(submittedPassword, user.password);
              if (match) {
                status = 200;
                if (user.admin == true) {
                  const payload = { user: user.username,"permissions": [
                    "user:read",
                    "user:write",
                    "user:admin"
                  ] };
                  const options = { expiresIn: '2d', issuer: 'https://github.com/snoopysecurity', algorithm: "HS256"};
                  const secret = process.env.JWT_SECRET;
                  const token = jwt.sign(payload, secret, options);
                  
                  result.token = token;
                  result.status = status;
                  result.result = user;
                } else {

                  const payload = { user: user.username,"permissions": [
                    "user:read",
                    "user:write"
                  ] };
                  const options = { expiresIn: '2d', issuer: 'https://github.com/snoopysecurity', algorithm: "HS256"};
                  const secret = process.env.JWT_SECRET;
                  const token = jwt.sign(payload, secret, options);
                  
                  result.token = token;
                  result.status = status;
                  result.result = user;
                }
                // Create a token
              
              } else {
                status = 401;
                result.status = status;
                result.error = `Authentication error`;
              }
              if (status === 200) {
                await recordActivity(user.username, 'login', 'v2');
                res.setHeader('Authorization', 'Bearer ' + result.token);
                setAuthCookie(req, res, result.token);
              }
              res.status(status).send(result);
            } catch (err) {
              status = 500;
              result.status = status;
              result.error = err;
              res.status(status).send(result);
            }
          } else {
            status = 404;
            result.status = status;
            result.error = 'Login Failed! User ' + username + ' not found!';
            res.status(status).send(result);
          }
      } catch (err) {
          status = 500;
          result.status = status;
          result.error = err;
          res.status(status).send(result);
      }
  },

  // Legacy authentication challenge: account existence alone is treated as proof.
  loginLegacy: async (req, res) => {
    const { username } = req.body;
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    if (typeof username !== 'string' || username.length === 0) {
      return res.status(400).send({ status: 400, error: 'username is required' });
    }
    try {
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(404).send({ status: 404, error: 'Login Failed! User ' + username + ' not found!' });
      }

      const permissions = ['user:read', 'user:write'];
      if (user.admin === true) permissions.push('user:admin');
      const token = jwt.sign(
        { user: user.username, permissions },
        process.env.JWT_SECRET,
        { expiresIn: '2d', issuer: 'https://github.com/snoopysecurity', algorithm: 'HS256' }
      );
      await recordActivity(user.username, 'login', 'v1');
      res.setHeader('Authorization', 'Bearer ' + token);
      setAuthCookie(req, res, token);
      return res.status(200).send({
        token,
        status: 200,
        result: { username: user.username, admin: user.admin === true }
      });
    } catch (err) {
      return res.status(500).send({ status: 500, error: err });
    }
  },

  getAll: async (req, res) => {
    //res = set_cors(req,res)
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
      let result = {};
      let status = 200;

      try {
          const users = await User.find({});
          result.status = status;
          result.result = users;
      } catch (err) {
          status = 500;
          result.status = status;
          result.error = err;
      }
      res.status(status).send(result);
  },

  getLoginLogs: (req, res) => {
      // Returns raw logs. Vulnerable to Log Pollution/Forgery if displayed line-by-line.
      res.set('Content-Type', 'text/plain');
      res.send(loginLogs.join('\n'));
  },


  updateProfileBio: async (req, res) => {
    const { bio } = req.body || {};
    if (typeof bio !== 'string' || bio.length > 2000) {
      return res.status(400).send({ error: 'bio must be a string of at most 2000 characters' });
    }
    try {
      const user = await User.findOneAndUpdate(
        { username: req.decoded.user }, { $set: { bio } }, { new: true, runValidators: true }
      );
      if (!user) return res.status(404).send({ error: 'User not found' });
      profileResponseCache.delete('/api/v2/users/profile');
      return res.send({ username: user.username, bio: user.bio, admin: user.admin });
    } catch (err) {
      return res.status(500).send({ error: 'Could not update profile bio' });
    }
  },

  // Vulnerability: a persisted bio is interpolated into a signed XML export
  // without XML escaping. The restore workflow trusts the signed document.
  exportProfileXml: async (req, res) => {
    try {
      const user = await User.findOne({ username: req.decoded.user });
      if (!user) return res.status(404).send({ error: 'User not found' });
      const xml = `
      <userProfile>
        <username>${user.username}</username>
        <admin>${user.admin}</admin>
        <bio>${user.bio || ''}</bio>
      </userProfile>
    `;
      res.set('X-Profile-Export-Signature', profileExportSignature(user.username, xml));
      res.set('Access-Control-Expose-Headers', 'X-Profile-Export-Signature');
      res.type('application/xml').send(xml);
    } catch (err) {
      res.status(500).send({ error: 'Could not export profile' });
    }
  },

  restoreProfileXml: async (req, res) => {
    const { xml, signature } = req.body || {};
    if (typeof xml !== 'string' || xml.length > 16384 ||
        typeof signature !== 'string' || !/^[a-f0-9]{64}$/.test(signature)) {
      return res.status(400).send({ error: 'Signed XML export required' });
    }
    const expected = profileExportSignature(req.decoded.user, xml);
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
      return res.status(403).send({ error: 'Export signature is invalid' });
    }
    try {
      const document = new (require('@xmldom/xmldom').DOMParser)().parseFromString(xml, 'application/xml');
      const root = document.documentElement;
      if (!root || root.nodeName !== 'userProfile') {
        return res.status(400).send({ error: 'Invalid profile XML' });
      }
      const fields = (name) => Array.from(root.childNodes).filter((node) => node.nodeType === 1 && node.nodeName === name);
      if (fields('username').length !== 1 || fields('username')[0].textContent !== req.decoded.user) {
        return res.status(400).send({ error: 'Export belongs to another account' });
      }
      const adminFields = fields('admin');
      if (!adminFields.length || !['true', 'false'].includes(adminFields.at(-1).textContent)) {
        return res.status(400).send({ error: 'Invalid profile role' });
      }
      // The migration reader uses the last admin element. A bio that closes
      // its element can add a second value to an otherwise trusted export.
      const admin = adminFields.at(-1).textContent === 'true';
      const user = await User.findOneAndUpdate(
        { username: req.decoded.user }, { $set: { admin } }, { new: true }
      );
      if (!user) return res.status(404).send({ error: 'User not found' });
      profileResponseCache.delete('/api/v2/users/profile');
      return res.send({ username: user.username, admin: user.admin });
    } catch (err) {
      return res.status(400).send({ error: 'Invalid profile XML' });
    }
  },

  // Vulnerability: XML Injection (Profile Import - Mass Assignment)
  importProfileXml: async (req, res) => {
      // Scenario: User imports profile from XML.
      // Vulnerability: The endpoint blindly accepts fields from the XML.
      // Mass Assignment: If XML contains <admin>true</admin>, user becomes admin.
      
      const xmlData = req.body.xml;
      if (!xmlData) return res.status(400).send("XML required");
      
      try {
          const parser = new xml2js.Parser({ explicitArray: false });
          const result = await parser.parseStringPromise(xmlData);
          
          if (result && result.userProfile) {
              const profile = result.userProfile;
              const targetUser = profile.username;
              
              // Build update object
              const updateData = {};
              if (profile.bio) updateData.bio = profile.bio;
              // Vulnerability: Accepting admin flag from XML
              if (profile.admin) updateData.admin = (profile.admin === 'true');
              
              const updatedUser = await User.findOneAndUpdate(
                  { username: targetUser },
                  updateData,
                  { new: true }
              );
              
              if (!updatedUser) {
                  return res.status(404).send({ success: false, message: "Target user '" + targetUser + "' not found." });
              }
              
              res.send({ 
                  success: true, 
                  message: "Profile updated successfully from XML.", 
                  data: updatedUser
              });
          } else {
              res.status(400).send("Invalid XML format. Root must be <userProfile>");
          }
      } catch (e) {
          res.status(500).send("XML Import Error: " + e.message);
      }
  },

  getProfile: async (req, res) => {
      try {
          const token = req.headers.authorization.split(' ')[1]; 
          const decoded = jwt.verify(token, process.env.JWT_SECRET, options);

          const cacheKey = req.originalUrl;
          const cached = profileResponseCache.get(cacheKey);
          if (cached && cached.expiresAt > Date.now()) {
              res.set('Cache-Control', 'public, max-age=60, s-maxage=60');
              res.set('Age', String(Math.floor((Date.now() - cached.createdAt) / 1000)));
              return res.send(cached.body);
          }
          if (cached) profileResponseCache.delete(cacheKey);
          
          const user = await User.findOne({ username: decoded.user });
          if (!user) return res.status(404).send("User not found");
          
          const body = {
              username: user.username,
              bio: user.bio,
              admin: user.admin,
              email: user.email,
              weeklyDigest: user.weeklyDigest,
              homeAddress: user.homeAddress
          };
          const now = Date.now();
          profileResponseCache.set(cacheKey, { body, createdAt: now, expiresAt: now + PROFILE_CACHE_TTL_MS });
          res.set('Cache-Control', 'public, max-age=60, s-maxage=60');
          res.send(body);
      } catch (err) {
          res.status(500).send(err.message);
      }
  },

  getUserProfileDetails: async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).send({ error: "User not found" });

      const profile = {
        username: user.username,
        bio: user.bio
      };

      // Intentional vulnerability: checks the target account's role rather than
      // the caller's role, so any signed-in user can read an admin's private fields.
      if (user.admin) {
        profile.email = user.email;
        profile.homeAddress = user.homeAddress;
      }

      res.send(profile);
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  },

  // Intentional challenge vulnerability: this returns another user's object
  // ID when an authenticated caller knows their email address.
  lookupRecoveryAccount: async (req, res) => {
    try {
      const user = await User.findOne({ email: req.body.email });
      if (!user) return res.status(404).send({ error: "Account not found" });

      res.send({ userId: user._id, username: user.username });
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  },

  // Intentional challenge vulnerability: there is no ownership or recovery
  // proof check. The user ID alone is enough to replace an account password.
  resetAccountPassword: async (req, res) => {
    try {
      const { userId, newPassword } = req.body;
      if (!userId || !newPassword) {
        return res.status(400).send({ error: "userId and newPassword are required" });
      }

      const user = await User.findById(userId);
      if (!user) return res.status(404).send({ error: "Account not found" });

      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();
      res.send({ success: true, username: user.username });
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  },

  changePasswordWithoutSessionRevocation: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).send({ error: "currentPassword and newPassword are required" });
      }

      const user = await User.findOne({ username: req.decoded.user });
      if (!user) return res.status(404).send({ error: "User not found" });

      const matches = await bcrypt.compare(currentPassword, user.password);
      if (!matches) return res.status(401).send({ error: "Current password is incorrect" });

      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();
      res.send({ success: true, username: user.username });
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  },

  getNotifications: async (req, res) => {
    try {
      res.set('Cache-Control', 'no-store');
      res.json({ notifications: await notifications.listForUser(req.decoded.user) });
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  },

  markNotificationRead: async (req, res) => {
    const notification = await notifications.markRead(req.decoded.user, req.params.id);
    if (!notification) return res.status(404).send({ error: 'Notification not found' });
    broadcast(req.decoded.user, { type: 'notification-updated', notification });
    res.set('Cache-Control', 'no-store');
    return res.json({ notification });
  },

  getProfileSharing: async (req, res) => {
    try {
      const user = await User.findOne({ username: req.decoded.user });
      if (!user) return res.status(404).send({ error: 'User not found' });
      res.set('Cache-Control', 'no-store');
      return res.json({ profileSharing: user.profileSharing || { enabled: false, partnerOrigin: '', fields: [] } });
    } catch (err) { return res.status(500).send({ error: err.message }); }
  },

  updateProfileSharing: async (req, res) => {
    const { enabled, partnerOrigin, fields } = req.body || {};
    const allowedFields = ['username', 'email', 'homeAddress'];
    if (typeof enabled !== 'boolean' || typeof partnerOrigin !== 'string' || !Array.isArray(fields) ||
        fields.some((field) => !allowedFields.includes(field)) || new Set(fields).size !== fields.length) {
      return res.status(400).send({ error: 'Provide enabled, partnerOrigin, and supported fields' });
    }
    if (enabled) {
      try {
        const origin = new URL(partnerOrigin);
        if (!['https:', 'http:'].includes(origin.protocol) || origin.origin !== partnerOrigin) throw new Error('invalid origin');
      } catch (_err) { return res.status(400).send({ error: 'Enter a valid partner origin' }); }
    }
    try {
      const user = await User.findOneAndUpdate(
        { username: req.decoded.user },
        { $set: { profileSharing: { enabled, partnerOrigin, fields } } },
        { new: true, runValidators: true }
      );
      if (!user) return res.status(404).send({ error: 'User not found' });
      res.set('Cache-Control', 'no-store');
      return res.json({ profileSharing: user.profileSharing });
    } catch (err) { return res.status(500).send({ error: err.message }); }
  },

  readSharedProfileJsonp: async (req, res) => {
    const callback = req.query.callback;
    if (typeof callback !== 'string' || !/^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/.test(callback)) {
      return res.status(400).send({ error: "callback must be a JavaScript function name" });
    }

    const token = readCookie(req, 'auth_token');
    if (!token) return res.status(401).send({ error: 'Authentication cookie required' });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: options.issuer,
        algorithms: ['HS256']
      });
      const user = await User.findOne({ username: decoded.user });
      if (!user) return res.status(404).send({ error: "User not found" });
      const sharing = user.profileSharing || {};
      if (!sharing.enabled) return res.status(403).send({ error: 'Profile sharing is disabled' });
      // Intentionally does not validate req.get('origin') against partnerOrigin.
      const profile = Object.fromEntries((sharing.fields || []).map((field) => [field, user[field]]));
      const json = JSON.stringify({ profile }).replace(/</g, '\\u003c');
      res.set('Cache-Control', 'no-store');
      res.type('application/javascript').send(`${callback}(${json});`);
    } catch (err) {
      res.status(401).send({ error: 'Invalid or expired authentication cookie' });
    }
  },

  adminCreateUser: async (req, res) => {
    try {
     
      let token;
      // Check Authorization header first (Bearer token), then fall back to cookie
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
      } else if (req.headers.cookie) {
        const cookies = req.headers.cookie.split(';');
        const authCookie = cookies.find(c => c.trim().startsWith('auth_token='));
        if (authCookie) token = authCookie.split('=')[1];
      }
      
      if (!token) return res.status(401).send({ error: "Unauthorized" });

      // Verify token is Admin
      const decoded = jwt.verify(token, process.env.JWT_SECRET, options);
      const user = await User.findOne({ username: decoded.user });
      if (!user || !user.admin) return res.status(403).send({ error: "Forbidden: Admin only" });
      
      // 2. Parse Body (Parses JSON even if Content-Type is text/plain)
      let data = req.body;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) { /* ignore */ }
      }
      
      // 3. Create User
      if (data && data.username && data.password) {
          const existing = await User.findOne({ username: data.username });
          if (existing) return res.status(409).send({ error: "User already exists" });

          const newUser = new User({
              username: data.username,
              password: data.password,
              // Text bodies bypass the field policy applied to the other
              // formats, so this input can mass-assign an administrator role.
              admin: req.is('text/plain') ? !!data.admin : false
          });
          await newUser.save();
          res.status(200).send({ message: `User ${data.username} created successfully.` });
      } else {
          res.status(400).send({ error: "Missing username or password" });
      }
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  },



  // Vulnerability: LDAP Injection
  ldapSearch: (req, res) => {
    const user = req.query.user || req.body.user;
    
    // Vulnerability: Unsanitized input concatenated into LDAP filter
    // Standard filter: (uid=username)
    const filter = "(uid=" + user + ")";
    
    // Simulated LDAP Server Logic
    let results = [];
    
    // 1. Wildcard Injection: user = "*"
    if (user === "*" || filter.includes("(uid=*)")) {
        results = ["admin", "guest", "manager"];
    }
    // 2. Attribute Injection: user = "admin)(objectClass=*)"
    // Filter becomes: (uid=admin)(objectClass=*)
    else if (filter.includes(")(objectClass=*)")) {
        // Vulnerability Impact: By injecting a valid second filter, the attacker might bypass field restrictions
        // or trigger a verbose mode, revealing sensitive attributes normally hidden.
        results = [
            { 
                username: "admin", 
                email: "admin@internal.dvws", 
                guid: "a1b2-c3d4-e5f6", 
                description: "Super User with unrestricted access",
                password: "letmein" 
            }
        ];
    }
    // Normal match
    else if (user === "admin") {
        results = ["admin"];
    }
    
    res.status(200).send({ 
        filter: filter, // Reflect filter for educational/debugging
        results: results 
    });
  },

  // Exported for direct cookie-policy coverage without requiring a local TLS
  // certificate in the HTTP API test process.
  authCookieOptions
};
