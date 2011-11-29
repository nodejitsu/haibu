/*
 * index.js: Top level module include for utils module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var crypto = require('crypto'),
    fs = require('fs'),
    sys = require('sys'),
    http = require('http'),
    path = require('path'),
    spawn = require('child_process').spawn,
    flatiron = require('flatiron'),
    async = flatiron.common.async,
    rimraf = flatiron.common.rimraf,
    haibu = require('../../haibu');

var utils = flatiron.common;

//
// ### Include Exports
// Export additional utils components
//
var base64 = utils.base64 = require('./base64');
var bin    = utils.bin    = require('./bin');
var npm    = utils.npm    = require('./npm');

exports.each = function (obj, iterator) {
  var keys = Object.keys(obj);
  keys.forEach(function (key) {
    iterator(obj[key], key, obj);
  });
};

//
// ### function showWelcome (mode, ipAddress, port)
// #### @mode {string} The mode that haibu is currently running in.
// #### @ipAddress {string} The IP Address / host that haibu is binding to.
// #### @port {int} The port that haibu is binding to.
// #### @hookPort {int} The port that haibu's hook-host is binding to
// Prints the signature `haibu` welcome message using the colors module.
//
utils.showWelcome = function (role, ipAddress, port, hookPort) {
  var plugins = Object.keys(haibu.activePlugins),
      hookMsg,
      serverMsg;

  serverMsg = [
    'haibu'.yellow.bold,
    'started @'.grey,
    ipAddress.green.bold,
    'on port'.grey,
    port.toString().green.bold,
    'as'.grey,
    role.green.bold
  ].join(' ');

  console.log('      __                  __               '.yellow);
  console.log('     / /_    ______  __  / /_     __  __   '.yellow);
  console.log('    / __ \\  / __  / / / /  __ \\  / / / /   '.yellow);
  console.log('   / / / / / /_/ / / / /  /_/ / / /_/ /    '.yellow);
  console.log('  /_/ /_/  \\__,_/ /_/ /_/\\___/  \\__,_/     '.yellow);
  console.log('  ');
  console.log('  This is Open Source Software available under'.grey);
  console.log('  the MIT License.'.grey);
  console.log('  ');
  console.log('  © 2010 Nodejitsu Inc.'.grey);
  console.log('  All Rights Reserved - www.nodejitsu.com'.grey);

  //
  // If a `hookPort` has been supplied print a
  // message accordingly.
  //
  if (hookPort) {
     hookMsg = [
      'haibu-hook'.yellow.bold,
      'started @'.grey,
      ipAddress.green.bold,
      'on port'.grey,
      hookPort.toString().green.bold,
      'as'.grey,
      (role+'-hook').green.bold
    ].join(' ');

    console.log('  ' + hookMsg);
  }

  console.log('  ' + serverMsg);

  //
  // If there are any active plugins then
  // indicate this via logged messages
  //
  if (plugins.length > 0) {
    plugins = plugins.map(function (p) { return p.yellow.bold }).join(', '.grey);
    console.log('    using plugins: '.grey + plugins);
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
// function handler (options)
// this was the guts of createServer. i've made it seperate,
// so that I can also support a streaming interface.
//
utils.handler = function (options) {
  return function (req, res) {
    var router,
        contentType,
        contentLength,
        body = '',
        length = 0,
        raw;

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

      contentType = req.headers['content-type'] && req.headers['content-type'].match(/([\w\-]+\/[\w\-]+)/)[1];
      router = options.contentTypes[contentType];

      if (!router || !router.handle) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'Unexpected Content-Type: ' + contentType }));
      }

      if (contentType === 'application/octet-stream' || contentType === 'application/x-tar-gz') {
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
        result.headers['x-powered-by'] = options.name || 'haibu';

        res.writeHead(result.status, result.headers);
        res.end(result.body.toString());
      });

      logger.once('log', function (data) {
        delete data.date;
        haibu.emit('service:response', 'info', data);
      });
    });
  }
};

//
// ### function createServer (options)
// #### @options {Object} Options for this server to handle.
// Creates an instance of http.Server that will log using Winston and route using Journey.
// with the following options:
//
//    {
//      contentTypes: 'Object containing routers for specific contentTypes'
//      port:         'Port for this server to listen on'
//      name:         'Value for `x-powered-by` header'
//      secure:       'Value indicating if this server is secure'
//    }
//
utils.createServer = function (options) {
  if (!options.contentTypes) {
    throw new Error('Options must have `contentTypes` property.');
  }

  var server = http.createServer(utils.handler(options));

  if (options.port) {
    server.listen(options.port);
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
// ### function rmApp (appsDir, app, callback)
// #### @appsDir {string} Root for all application source files.
// #### @app {App} Application to remove directories for.
// #### @callback {function} Continuation passed to respond to.
// Removes all source code associated with the specified `app`.
//
utils.rmApp = function (appsDir, app, callback) {
  return rimraf(path.join(appsDir, app.user, app.name), callback);
};

//
// ### function rmApps (appsDir, callback)
// #### @appsDir {string} Root for all application source files.
// #### @callback {function} Continuation passed to respond to.
// Removes all source code associated with all users and all applications
// from this Haibu process.
//
utils.rmApps = function (appsDir, callback) {
  if (!callback && typeof appsDir === 'function') {
    callback = appsDir;
    appsDir = null;
  }

  appsDir = appsDir || haibu.config.get('directories:apps');
  fs.readdir(appsDir, function (err, users) {
    if (err) {
      return callback(err);
    }

    async.forEach(users, function rmUser (user, next) {
      rimraf(path.join(appsDir, user), next);
    }, callback);
  });
};

//
// ### sanitizeAppname (name)

// Returns sanitized appname (with removed characters) concatenated with
// original name's hash
//
utils.sanitizeAppname = function (name) {
  var sha1 = crypto.createHash('sha1');

  sha1.update(name);
  return name.replace(/[^a-z0-9\-\_]+/g, '-') + '-' + sha1.digest('hex');
};
