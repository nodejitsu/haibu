setInterval(function () {
  process.stdout.write(process.env['username'] + ':' + process.env['password']);
}, 500);

require('http').createServer(function () {}).listen(8456);