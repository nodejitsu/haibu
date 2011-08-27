var fs = require('fs'),
    http = require('http');
        
var server = http.createServer(function (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write('responding to something');
  res.end();
});

server.listen(8732);

setTimeout(function () {
  throw new Error('Testing user generated failure after bound port.')
}, 2500);