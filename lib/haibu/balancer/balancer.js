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
    haibu = require('haibu');

//
// ### @matchers
// Regular expression parsers for handling different
// persistent storage files used by `haibu`.
//
var matchers = {
  app: /^([\w|\-]+)\.package\.json/,
  pid: /^([\w|\-]+)\.(\d+)\.json/
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
  this.active    = {};
  this.processes = new haibu.ProcessStore(options);
  
  //
  // Load files into Memory when they are found 
  // in the ProcessStore
  //
  this.processes.on('created', function (file) {
    self._add(file, function () {
      self.emit('created', file);
      haibu.emit('balancer:created', 'info', { file: file });
    });
  });
  
  //
  // Remove files from the Balancer when they are removed
  // from the ProcessStore.
  //
  this.processes.on('removed', function (file) {
    self._remove(file);
    self.emit('removed', file);
    haibu.emit('balancer:removed', 'info', { file: file });
  });
  
  //
  // Load all relevant files on initial load.
  //
  this.processes.once('load', function (files) {
    function checkFile (file, next) {
      return files[file].isFile() ? self._add(file, next) : next();
    }

    async.forEach(Object.keys(files), checkFile, function (err) {
      return err ? self.emit('error', err) : self.emit('ready', self.active);
    });
  })
  
  //
  // Start monitoring for process files.
  //
  this.processes.monitor();
  
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
Balancer.prototype.handle = function (req, res) {
  var record = this.findDrone(req), drone;
  
  req.ptime = Date.now();
  haibu.emit('balancer:incoming', 'info', req.headers);
  
  if (!record) {
    return this.serveText(req, res, {
      code: 400, 
      message: 'Application not found for: ' + req.headers.host
    });
  }
  else if (!record.drones || record.drones.length === 0) {
    return this.serveText(req, res, {
      code: 400, 
      message: 'No drones for: ' + req.headers.host
    });
  }
  
  drone = record.drones.shift();
  this.httpProxy.proxyRequest(req, res, drone);
  record.drones.push(drone);
};

//
// ### function findDrone (req)
// #### @req {ServerRequest} Incoming server request to find drones against
// Attempts to find a drone for the incoming server request
// by cross-referencing `req.headers.host` against the `domain`
// or `domains` property of each application known to `haibu`.
//
Balancer.prototype.findDrone = function (req) {
  var self = this, 
      host = req.headers.host.split('.'),
      domain = host.slice(-2).join('.');
  
  return Object.keys(this.active).map(function (app) {
    return self.active[app];
  }).filter(function (rec) {
    return rec.app.domain === domain || (rec.app.domains
      && rec.app.domains.indexOf(domain) !== -1);
  })[0];  
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

//
// ### function _add (file, callback)
// #### @file {string} Filename to add to this instance.
// #### @callback {function} **Optional** Continuation to respond to when complete.
// Adds the data in the specified `file` to the managed state for 
// this balancer instance. 
//
Balancer.prototype._add = function (file, callback) {
  var self = this;
  
  fs.readFile(file, function (err, data) {
    if (err) {
      return callback ? callback(err) : null;
    }
    
    try {
      var json = JSON.parse(data.toString()),
          app = self._parseFilename(file);
      
      if (app && app.type) {
        switch (app.type) {
          case 'package':
            self.active[app.name] = self.active[app.name] || {
              drones: []
            };

            self.active[app.name].app = json;
            break;
          case 'pid':
            self.active[app.name] = self.active[app.name] || {
              drones: []
            };

            self.active[app.name].drones.push({
              pid: json.pid,
              host: json.host,
              port: json.port
            });
            break;
        }
      }

      return callback ? callback() : null;
    }
    catch (ex) {
      return callback ? callback(ex) : null;
    }
  });
};

//
// ### function _remove (file)
// #### @file {string} Filename to remove from this instance
// Removes the data in the specified `file` from the managed state
// for this instance.
//
Balancer.prototype._remove = function (file) {
  var app = this._parseFilename(file), index;
  
  if (app && app.type) {
    switch (app.type) {
      case 'package':
        delete this.active[app.name];
        break;
      case 'pid':
        if (this.active[app.name] && this.active[app.name].drones) {
          index = this.active[app.name].drones.map(function (d) { 
            return d.pid;
          }).indexOf(parseInt(app.drone, 10));
          
          this.active[app.name].drones.splice(index, 1);
        }
        break;
    }
  }
};

//
// ### function _parseFilename (file)
// #### @file {string} Filename to parse
// Parses the data out of the specified `file` to be used
// in the managed application state for this instance.
//
Balancer.prototype._parseFilename = function (file) {
  var base = path.basename(file),
      match, drone, app;
  
  if (matchers.app.test(base)) {
    return {
      type: 'package',
      name: base.match(matchers.app)[1]
    }
  }
  else if (matchers.pid.test(base)) {
    match = base.match(matchers.pid);
    return {
      type:  'pid',
      name:  match[1],
      drone: match[2]
    };
  }
  
  return null;
};