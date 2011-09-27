/*
 * proxy.js: Responsible for proxying across all applications available to haibu.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var util = require('util'),
    path = require('path'),
    fs = require('fs'),
    events = require('events'),
    async = require('async'),
    qs = require('querystring'),
    httpProxy = require('http-proxy'),
    haibu = require('../../haibu');

//
// ### @matchers
// Regular expression parsers for handling different
// persistent storage files used by `haibu`.
//
var matchers = {
  app: /^([\w\-\.]+)\.package\.json/,
  pid: /^([\w\-\.]+)\.(\d+)\.json/
};

//
// ### function Balancer (options)
// #### @options {Object} Options for this instance.
// Constructor function for the `haibu` Balancer responsible
// for load balancing across all applications know to haibu on
// this machine.
//
var Balancer = exports.Balancer = function (options) {
  events.EventEmitter.call(this);

  var self = this;

  //
  // Setup shared state for the `haibu.ProcessStore`.
  //
  //app : {name:...,user:...,drones:...[],domains:...[],proxies:{desiredport:[{droneid:,port:}]}}
  this.users = {
    //user : apps{ name: app}
  };
  this.domains = {
    //Domain : app
  };
  this.drones = {
    //id : {id: ..., user : ..., app:  ..., proxies: ...}
  };
  this.proxies = {};
  this.active    = {};
  
  //
  // Setup the balancing proxy using `node-http-proxy`.
  //
  this.httpProxy = new httpProxy.HttpProxy(options);

  this.httpProxy.on('end', function (req, res) {
    var diff = Date.now() - req.ptime;
    haibu.emit('balancer:proxy', 'info', {
      url: req.url,
      method: req.method,
      time: diff + 'ms'
    });
  });
};

//
// Inherit from `events.EventEmitter`.
//
util.inherits(Balancer, events.EventEmitter);

//
// ### function handle (req, res)
// #### @req {ServerRequest} Incoming server request to balancer
// #### @res {ServerResponse} Outoing server request to write to.
// Attempts to proxy the incoming request to the specified application
// by using the `req.headers.host` property.
//
Balancer.prototype.handle = function (req, res, desiredPort) {
  var self = this,
      host = req.headers.host.split('.'),
      domain = host.slice(-2).join('.').toLowerCase();
  
  var apps = this.domains[domain], app, drone;

  if (!apps || !apps.length) {
    return this.serveText(req, res, {
      code: 400,
      message: 'App not found for domain: ' + req.headers.host
    });
  }
  
  var droneMappings, droneMapping;
  for (var i = 0; i < apps.length; i++) {
    app = apps[i];
    droneMappings = app.proxies[desiredPort];
    if (drones) {
      droneMapping = droneMappings.shift();
      droneMappings.push(droneMapping);
    }
  }

  if (!droneMapping) {
    return this.serveText(req, res, {
      code: 400,
      message: 'Drone not found for : ' + req.headers.host + ':' + port
    });
  }
  
  var droneId = droneMapping.droneId;
  var actualPort = droneMapping.port;

  req.ptime = Date.now();
  haibu.emit('balancer:incoming', 'info', req.headers);

  return this.httpProxy.proxyRequest(req, res, droneMapping);
};

//
// ### function serveText (req, res, data)
// #### @req {ServerRequest} Incoming server request
// #### @res {ServerResponse} Outoing server request to write to.
// Writes `data.message` to the outgoing `res` along with any
// metadata passed as `data.meta`.
//
Balancer.prototype.serveText = function (req, res, data) {
  var text = data.message,
      diff = Date.now() - req.ptime;

  if (data.meta) {
    text = [message, qs.unescape(qs.stringify(data.meta, ', '))].join(' | ');
  }

  res.writeHead(data.code, {
    'Content-Length': text.length,
    'Content-Type': 'text/plain'
  });

  if (req.method !== 'HEAD') {
    res.write(text);
  }

  haibu.emit('balancer:serve', 'info', {
    text: text,
    code: data.code,
    time: diff + 'ms'
  });

  res.end();
};

//
// ### function close ()
// Closes this balancer by shutting down the child
// `HttpProxy` instance.
//
Balancer.prototype.close = function () {
  this.httpProxy.close();
};

Balancer.prototype.addApp = function (app, callback) {
  var user = app.user;
  var userApps = this.users[user] || (this.users[user] = {});
  //
  // Clean the app if it already exists
  //
  if (userApps[app.name]) {
    destroyApp(user, app, add);
  }
  else {
    add();
  }
  
  function add() {
    app.drones = [];
    userApps[app.name] = app;
    if (!app.hasOwnProperty('active')) {
      app.active = true;
    }
    var domain = app.domain;
    if (domain) {
      var domainApps = this.domains[domain] || (this.domains[domain] = []);
      domainApps.push(domain);
    }
    if (app.domains) {
      app.domains.forEach(function (domain) {
        var domainApps = this.domains[domain] || (this.domains[domain] = []);
        domainApps.push(domain);
      })
    }
    callback();
  }
};

Balancer.prototype.deactivateApp = function (user, app, callback) {
  var userApps = this.users[user];
  if (!userApps) {
    return callback('User "' + user + '" does not exists.');
  }
  
  userApps[app.name].active = false;
  return callback();
};

Balancer.prototype.activateApp = function (app, callback) {
  var user = app.user,
      userApps = this.users[user],
      name = app.name;
  
  if (!userApps) {
    return callback('User "' + user + '" does not exists.');
  }
  
  app = userApps[name];
  if (!app) {
    return callback('User "' + user + '" has no app "' + name +'"');
  }
  
  app.active = true;
  return callback();
};

Balancer.prototype.destroyApp = function (app, callback) {
  var user = app.user,
      userApps = this.users[user],
      name = app.name,
      empty = true;
      
  if (!userApps) {
    return callback('User "' + user + '" does not exists.');
  }
  
  app = userApps[name];
  if (!app) {
    return callback('User "' + user + '" has no app "' + name +'"');
  }
  
  delete userApps[name];
  for (var k in userApps) {
    empty = false;
    break;
  }
  
  if (empty) {
    delete this.users[user];
  }
  
  return callback();
};
Balancer.prototype.addDrone = function (droneid, app, callback) {
  var user = app.user,
      userApps = this.users[user],
      name = app.name,
      appDrones,
      drone;
      
  if (!userApps) {
    return callback('User "' + user + '" does not exists.');
  }
  
  app = userApps[name];
  if (!app) {
    return callback('User "' + user + '" has no app "' + name +'"');
  }
  
  appDrones = app.drones || (app.drones = []);
  drone = this.drones[droneid] = {
    id: droneid,
    user: user,
    app: app,
    proxies: {}
  };
  
  appDrones.push(drone);
  
  return callback();
};

Balancer.prototype.destroyDrone = function (droneid, callback) {
  var drone = this.drones[droneid],
      app = drone.app,
      appDrones = app.drones,
      l = appDrones.length,
      droneProxies = drone.proxies,
      appProxies = app.proxies,
      mapping;

  if (!drone) {
    return callback('Drone "' + droneid + '" does not exists.');
  }
  
  delete this.drones[droneid];
  for (var i = 0; i < l; i++) {
    if (appDrones[i] === drone) {
      appDrones.splice(i,1);
      break;
    }
  }
  
  for (var desiredPort in droneProxies) {
    mappings = appProxies[desiredPort];
    if (mappings) {
      mappings = mappings.filter(function (droneMapping) {
        return droneMapping.droneId !== droneid;
      });
      
      if (mappings.length === 0) {
        delete appProxies[desiredPort];
      }
    }
  }
  
  return callback();
};

Balancer.prototype.proxies = function (mapping, callback) {
  for (var droneId in mapping) {
    var portMapping = mapping[droneId];
    for (var desiredPort in portMapping) {
      this.proxy(droneId, desiredPort, portMapping[desiredPort]);
    }
  }
  
  return callback();
};

Balancer.prototype.proxy = function (droneid, desiredport, actualport, callback) {

};
