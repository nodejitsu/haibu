var dnode = require('dnode');
var http = require('http');
var path = require('path');

var ignoreHttp = function ignoreHttp(req,res) {
  res.writeHead(500);
  res.end();
}

exports.getDomainServer = function getDomainServer(socketPath, handler) {
  var server = http.createServer(handler || ignoreHttp);
  server.listen(path.resolve(socketPath));
  return server;
}

