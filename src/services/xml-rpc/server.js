var express = require('express');
var needle = require('needle');
var Deserializer = require('xmlrpc/lib/deserializer');
var Serializer = require('xmlrpc/lib/serializer');
var { Readable } = require('stream');

var router = express.Router();

// Parse raw XML body for XML-RPC requests
router.use(express.text({ type: ['text/xml', 'application/xml'] }));

// XML-RPC method handlers
var methods = {
  'dvws.RpcVersion': function (params, callback) {
    callback(null, '1.3.2');
  },

  'system.listMethods': function (params, callback) {
    var methodarray = ['system.listMethods', 'dvws.rpcversion', 'dvws.checkuptime, pingback.ping'];
    callback(null, methodarray);
  },

  'pingback.ping': function (params, callback) {
    callback(null, 'Method Disabled');
  },

  'dvws.CheckUptime': function (params, callback) {
    var url = params.toString();
    needle.get(url, { timeout: 3000 }, function (error, response) {
      if (!error && response.statusCode == 200) {
        console.log('Method call params for \'checkuptime\': ' + url);
      }
    });
    callback(null, 'Checking uptime for: ' + url);
  }
};

router.post('/', function (req, res) {
  var deserializer = new Deserializer();

  // Convert the body string into a readable stream for the deserializer
  var stream = new Readable();
  stream.push(req.body);
  stream.push(null);

  deserializer.deserializeMethodCall(stream, function (err, method, params) {
    if (err) {
      res.setHeader('Content-Type', 'text/xml');
      res.status(400).send(Serializer.serializeFault({ faultCode: -32700, faultString: 'Parse error: ' + err.message }));
      return;
    }

    var handler = methods[method];
    if (!handler) {
      console.log('Method ' + method + ' does not exist');
      res.setHeader('Content-Type', 'text/xml');
      res.status(200).send(Serializer.serializeFault({ faultCode: -32601, faultString: 'Method ' + method + ' not found' }));
      return;
    }

    handler(params, function (error, result) {
      res.setHeader('Content-Type', 'text/xml');
      if (error) {
        res.status(200).send(Serializer.serializeFault({ faultCode: -32603, faultString: error.message }));
      } else {
        res.status(200).send(Serializer.serializeMethodResponse(result));
      }
    });
  });
});

module.exports = router;
