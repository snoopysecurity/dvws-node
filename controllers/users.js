const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const connUri = process.env.MONGO_LOCAL_CONN_URL;
const User = require('../models/users');

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
              //res.cookie("SESSIONID", result.token, {httpOnly:true, secure:true});
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
  }
};
