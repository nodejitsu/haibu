/*
 * index.js: Top level module include for utils module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var sys = require('sys'),
    path = require('path'),
    async = require('async'),
    http = require('http'),
    mkdirp = require('mkdirp').mkdirp,
    rimraf = require('rimraf'),
    spawn = require('child_process').spawn,
    haibu = require('../../haibu');

var utils = exports;

//
// ### Include Exports
// Export additional utils components
//
var base64 = utils.base64 = require('./base64');
var bin    = utils.bin    = require('./bin');
var npm    = utils.npm    = require('./npm');

//
// ### function showWelcome (mode, ipAddress, port)
// #### @mode {string} The mode that haibu is currently running in.
// #### @ipAddress {string} The IP Address / host that haibu is binding to.
// #### @port {int} The port that haibu is binding to.
// #### @hookPort {int} The port that haibu's hook-host is binding to
// Prints the signature `haibu` welcome message using the colors module.
//
utils.showWelcome = function (role, ipAddress, port, hookPort) {
  var msg, msg2;
  msg = [
    'haibu'.yellow.bold,
    'started @'.grey,
    ipAddress.green.bold,
    'on port'.grey,
    port.toString().green.bold,
    'as'.grey,
    role.green.bold
  ].join(' ');

  // for hook-host/client
  if (hookPort) {
    msg2 = [
      'haibu-hook'.yellow.bold,
      'started @'.grey,
      ipAddress.green.bold,
      'on port'.grey,
      hookPort.toString().green.bold,
      'as'.grey,
      (role+'-hook').green.bold
    ].join(' ');
  }

  sys.puts('      __                  __               '.yellow);
  sys.puts('     / /_    ______  __  / /_     __  __   '.yellow);
  sys.puts('    / __ \\  / __  / / / /  __ \\  / / / /   '.yellow);
  sys.puts('   / / / / / /_/ / / / /  /_/ / / /_/ /    '.yellow);
  sys.puts('  /_/ /_/  \\__,_/ /_/ /_/\\___/  \\__,_/     '.yellow);
  sys.puts('  ');
  sys.puts('  This is Open Source Software available under'.grey);
  sys.puts('  the MIT License.'.grey);
  sys.puts('  ');
  sys.puts('  © 2010 Nodejitsu Inc.'.grey);
  sys.puts('  All Rights Reserved - www.nodejitsu.com'.grey);
  sys.puts('  ' + msg);

  // for hook
  if (hookPort) {
    sys.puts('  ' + msg2);
  }
};

//
// ### function getIpAddress (callback)
// #### @callback {function} The callback function to respond when complete
// Gets the IP Address bound to on the default device on this machine. Will
// respect if the device is `Darwin` or `Linux`.
//
utils.getIpAddress = function (callback) {
  var ipcheck, address, done = false;

  if (process.platform !== 'darwin') {
    // If we aren't on Mac OS X
    ipcheck = spawn('hostname', ['-i']);
  }
  else {
    // If we are on Mac OS X
    ipcheck = spawn('ipconfig', ['getifaddr', 'en1']);
  }

  // Get the data from the IP address child process.
  ipcheck.stdout.on('data', function (data) {
    address = data.toString().trim();
    var matches = address.match(/\d+\.\d+\.\d+\.\d+/);
    if (typeof matches === 'undefined' || matches.length <= 0) {
      if (!done) {
        done = true;
        callback(new Error('Output was not a valid ip address'));
      }
    }
  });

  ipcheck.stderr.on('data', function (data) {
    if (!done) {
      done = true;
      callback(new Error('Error: ' + data.toString()));
    }
  });

  ipcheck.on('exit', function (code) {
    if (!done) {
      callback(null, address);
    }
  });
};

//
// ### function createServer (router, logger, secure, port)
// #### @contentTypes {Object} Content types for this server to handle.
// #### @secure {bool} A value indicating whether this server is sercure
// #### [@port] {int} The optional port for this server to listen on.
// TODO (indexzero): Remove the @secure parameter or use it to indicate HTTPS
// Creates an instance of http.Server that will log using Winston and route using Journey.
//
utils.createServer = function (contentTypes, secure, port) {
  var server = http.createServer(function (req, res) {
    var router, contentType, contentLength, body = '', length = 0, raw;

    haibu.emit('service:incoming', 'info', {
      href: req.url,
      method: req.method
    });

    try {
      contentLength = parseInt(req.headers['content-length'], 10);
      if (contentLength && contentLength > 0 && !isNaN(contentLength)) {
        raw = new Buffer(contentLength);
      }
    }
    catch (ex) {
      // Ignore errors.
    }

    // Append the chunk to body
    req.addListener('data', function (chunk) {
      body += chunk;
      if (contentLength && contentLength > 0 && !isNaN(contentLength)) {
        chunk.copy(raw, length, 0);
        length += chunk.length;
      }
    });

    req.addListener('end', function () {
      if (!req.headers['content-type']) {
        req.headers['content-type'] = 'application/json';
      }

      contentType = req.headers['content-type'] && req.headers['content-type'].match(/([\d|\w|\-]+\/[\d|\w|\-]+)/)[1];
      router = contentTypes[contentType];

      if (!router || !router.handle) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'Unexpected Content-Type: ' + contentType }));
      }

      if (contentType === 'application/octet-stream') {
        if (typeof contentLength === 'undefined' || isNaN(contentLength)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ message: 'Content-Length is required' }));
        }

        body = raw;
      }

      //
      // Dispatch the request to the router
      //
      var logger = router.handle(req, body, function (result) {
        result.headers['X-Powered-By'] = 'haibu';
        
        res.writeHead(result.status, result.headers);
        res.end(result.body.toString());
      });

      logger.once('log', function (data) {
        delete data.date;
        haibu.emit('service:response', 'info', data);
      });
    });
  });

  if (port) {
    server.listen(port);
  }

  return server;
};

//
// ### function randomString (bits)
// #### @bits {integer} The number of bits for the random base64 string returned to contain
// randomString returns a pseude-random ASCII string which contains at least the specified number of bits of entropy
// the return value is a string of length ⌈bits/6⌉ of characters from the base64 alphabet
//
var randomString = exports.randomString = function (bits) {
  var chars, rand, i, ret;

  chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  ret = '';

  // in v8, Math.random() yields 32 pseudo-random bits (in spidermonkey it gives 53)
  while (bits > 0) {
    // 32-bit integer
    rand = Math.floor(Math.random() * 0x100000000);
    // base 64 means 6 bits per character, so we use the top 30 bits from rand to give 30/6=5 characters.
    for (i = 26; i > 0 && bits > 0; i -= 6, bits -= 6) {
      ret += chars[0x3F & rand >>> i];
    }
  }

  return ret;
};

//
// ### function getEndKey (startKey)
// #### @startKey {string} Startkey paramater for querying CouchDB.
// Returns the 'endkey' associated with the `startKey`, that is,
// the same string except with the last character alphabetically incremented.
//
// e.g. `char ==> chas`
//
var getEndKey = exports.getEndKey = function (startKey) {
  var length = startKey.length;

  return startKey.slice(0, length - 1) + String.fromCharCode(startKey.charCodeAt(length - 1) + 1);
};

//
// ### function mixin (target [source0, source1, ...])
// Copies enumerable properties from `source0 ... sourceN`
// onto `target` and returns the resulting object.
//
utils.mixin = function (target) {
  var objs = Array.prototype.slice.call(arguments, 1);
  objs.forEach(function (o) {
    Object.keys(o).forEach(function (attr) {
      if (! o.__lookupGetter__(attr)) {
        target[attr] = o[attr];
      }
    });
  });
  return target;
};

//
// ### function clone (object)
// #### @object {Object} Object to clone
// Shallow clones the specified object.
//
utils.clone = function (object) {
  return Object.keys(object).reduce(function (obj, k) {
    obj[k] = object[k];
    return obj;
  }, {});
};

//
// ### function rmdir (app, callback)
// #### @appsDir {string} Root for all application source files.
// #### @app {App} Application to remove directories for.
// #### @callback {function} Continuation passed to respond to.
// Removes all source code associated with the specified `app`.
//
utils.rmApp = function (appsDir, app, callback) {
  return rimraf(path.join(appsDir, app.user, app.name), callback);
};

//
// ### function initDirectories (directories, callback)
// #### @directories {Object} **Optional** Directories to initialize
// #### @callback {function} Continuation to respond to when complete
// Creates all of the specified `directories` in the current `haibu`
// environment. If no `directories` are supplied then all directories
// under `haibu.config.get('directories`) will be created.
//
utils.initDirectories = function (directories, callback) {
  if (!callback) {
    callback = directories;
    directories = null;
  }

  var paths = [];

  directories = directories || haibu.config.get('directories');
  Object.keys(directories).forEach(function (key) {
    paths.push(directories[key]);
  });

  function createDir(dir, next) {
    mkdirp(dir, 0755, function () {
      next();
    });
  }

  async.forEach(paths, createDir, function () {
    callback(null, paths);
  });
};

//
// ### function cleanDirectories (directories, callback)
// #### @directories {Object} **Optional** Directories to clean
// #### @callback {function} Continuation to respond to when complete
// Cleans all of the specified `directories` in the current `haibu`
// environment. If no `directories` are supplied then all directories
// under `haibu.config.get('directories`) will be cleaned.
//
utils.cleanDirectories = function (directories, callback) {
  if (!callback) {
    callback = directories;
    directories = null;
  }

  var paths = [];

  directories = directories || haibu.config.get('directories');
  Object.keys(directories).forEach(function (key) {
    paths.push(directories[key]);
  });

  function removeDir (dir, next) {
    rimraf(dir, function () {
      next();
    });
  }
  
  async.forEach(paths, removeDir, function () {
    callback(null, paths);
  });
};
