var eyes = require('eyes'),
    haibu = require('../lib/haibu');

// Create a new client for communicating with the haibu server
var client = new haibu.drone.Client({
  host: 'localhost',
  port: 9002
});

// A basic package.json for a node.js application on Haibu
var app = {
   "user": "bmeck",
   "name": "test",
   "domain": "devjitsu.com",
   "repository": {
     "type": "git",
     "url": "https://github.com/bmeck/hellocoffee.git"
   },
   "scripts": {
     "start": "coffee bin/server"
   }
};

// Attempt to start up a new application
client.start(app, function (err, result) {
  if (err) {
    console.log('Error spawning app: ' + app.name);
    return eyes.inspect(err);
  }
  
  console.log('Successfully spawned app:');
  eyes.inspect(result);
});
