var xmlrpc = require('xmlrpc');
var needle = require('needle');
 
// Creates an XML-RPC server to listen to XML-RPC method calls
var server = xmlrpc.createServer({ port: 9090, path: '/xmlrpc' })
// Handle methods not found
server.on('NotFound', function(method, params) {
  console.log('Method ' + method + ' does not exist');
})
// Handle method calls by listening for events with the method call name
server.on('dvws.RpcVersion', function (err, params, callback) {
  callback(null, '1.3.2')
})

server.on('system.listMethods', function (err, params, callback) {

  let methodarray = ['system.listMethods','dvws.rpcversion','dvws.checkuptime, pingback.ping'];

  callback(null, methodarray)
})


server.on('pingback.ping', function (err, params, callback) {
  callback(null, 'Method Disabled')
})

server.on('dvws.CheckUptime', function (err, params, callback) {

  module.exports.get = function(url) {
    var result = needle.get(url, { timeout: 3000 }, function(error, response) {
    if (!error && response.statusCode == 200) {
      console.log('Method call params for \'checkuptime\': ' + url)
      var rp = response.body
    }
    return rp;
  });
  return result;
}


  var get_result = module.exports.get(params.toString());
  // ...perform an action...
  // Send a method response with a value
  callback(null, get_result)
})

console.log('XML-RPC server listening on port 9090')

