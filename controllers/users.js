const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const xml2js = require('xml2js');

const connUri = process.env.MONGO_LOCAL_CONN_URL;
const User = require('../models/users');

const options = {
  expiresIn: '2d',
  issuer: 'https://github.com/snoopysecurity',
  algorithms: ["HS256", "none"],
  ignoreExpiration: true
};

// In-memory log store for login attempts (Vulnerable to Log Pollution)
const loginLogs = [];

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
    const { username, password } = req.body;
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
              const match = await bcrypt.compare(password, user.password);
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
              res.setHeader('Authorization', 'Bearer '+ result.token); 
              // Set cookie for CSRF demonstration
              res.setHeader('Set-Cookie', `auth_token=${result.token}; Path=/; HttpOnly`);
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


  // Vulnerability: XML Injection (Profile Export)
  exportProfileXml: async (req, res) => {
    // Scenario: User exports their profile to XML.
    // Vulnerability: The 'bio' and 'username' fields are user-controlled and concatenated directly.
    const username = req.body.username || "guest";
    const bio = req.body.bio || "No bio";
    
    // Construct XML manually (Vulnerable)
    const xml = `
      <userProfile>
        <username>${username}</username>
        <role>user</role>
        <bio>${bio}</bio>
      </userProfile>
    `;
    
    res.set('Content-Type', 'application/xml');
    res.send(xml);
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
          
          const user = await User.findOne({ username: decoded.user });
          if (!user) return res.status(404).send("User not found");
          
          res.send({
              username: user.username,
              bio: user.bio,
              admin: user.admin
          });
      } catch (err) {
          res.status(500).send(err.message);
      }
  },

  adminCreateUser: async (req, res) => {
    try {
     
      let token;
      if (req.headers.cookie) {
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
              admin: !!data.admin
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
  }
};
