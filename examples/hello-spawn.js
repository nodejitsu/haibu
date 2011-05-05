require.paths.unshift(require('path').join(__dirname, 'lib'));

var eyes = require('eyes'),
    haibu = require('haibu');

var client = new haibu.drone.Client({
  host: 'localhost',
  port: 9002
});

var app = {
   "resource": "App",
   "user": "marak",
   "name": "test",
   "domain": "devjitsu.com",
   "directories": {
     "home": "hellonode"
   },
   "repository": {
     "type": "git",
     "url": "https://github.com/Marak/hellonode.git",
     "branch": "master"
   },
   "scripts": {
     "start": "server.js"
   }
};

client.start(app, function (err, result) {
  eyes.inspect(err);
  eyes.inspect(result);
});