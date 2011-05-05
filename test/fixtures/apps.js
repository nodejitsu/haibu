/*
 * apps.js: Seed data for Application resource.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

exports.apps = [
  {
     "resource": "App",
     "name": "test",
     "subdomain":"test",
     "state": "stopped",
     "maxDrones": 1,
     "drones": [],
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
  },
  {
     "resource": "App",
     "name": "chat",
     "subdomain":"test",
     "state": "stopped",
     "maxDrones": 1,
     "drones": [],
     "directories": {
       "home": "node-chat"
     },
     "repository": {
       "type": "git",
       "url": "https://github.com/scottgonzalez/node-chat.git",
       "branch": "master"
     },
     "scripts": {
       "start": "demo/chat.js"
     }
  }
];
