setInterval(function () {
  console.log('%j', process.argv);
}, 500);

require('http').createServer(function () {}).listen(8456);