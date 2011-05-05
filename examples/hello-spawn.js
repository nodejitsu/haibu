require.paths.unshift(require('path').join(__dirname, 'lib'));

var eyes = require('eyes'),
    haibu = require('haibu');

var client = new haibu.drone.Client({
  host: 'localhost',
  port: 9002
});

var app = {
   "user": "marak",
   "name": "test",
   "domain": "devjitsu.com",
   "repository": {
     "type": "git",
     "url": "https://github.com/Marak/hellonode.git",
   },
   "scripts": {
     "start": "server.js"
   }
};

client.start(app, function (err, result) {
  if (err) {
    console.log('Error spawning app: ' + app.name);
    return eyes.inspect(err);
  }
  
  console.log('Successfully spawned app:');
  eyes.inspect(result);
});
