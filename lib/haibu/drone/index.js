/*
 * index.js: Top-level include for the drone module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs'),
    path = require('path'),
    http = require('http'),
    flatiron = require('flatiron'),
    hookio = require('hook.io'),
    haibu = require('../../haibu'),
    async = haibu.utils.async;

//
// ### Include Exports
// Export other components in the module
//
exports.Drone        = require('./drone').Drone;
exports.Client       = require('./client').Client;
exports.started      = false;

//
// ### function startHook (options, callback)
// #### @options {Object} Options for the `hookio.Hook` instance.
// #### @callback {function} Continuation to respond to when complete.
// Starts a new `hookio.Hook` for this `haibu` process.
//
exports.startHook = function (options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = null;
  }

  options = options || { name: 'haibu' };

  var hook = new hookio.Hook(options);
  hook.listen(options, function (err) {
    haibu.running.hook = hook;
    return err ? callback(err) : callback(null, hook);
  });
};

//
// ### function autostart (server, callback)
// #### @server {http.Server} Haibu drone server to autostart drones with.
// #### @callback {function} Continuation to respond to when complete
// Autostarts drones for all applications persisted to
// `haibu.config.get('directories:autostart')`.
//
exports.autostart = function (server, callback) {
  var autostartDir = haibu.config.get('directories:autostart');
  
  //
  // Helper function which starts multiple drones
  // a given application.
  //
  function startDrones (pkg, done) {
    if (pkg.drones == 0) {
      return done();
    }

    var started = 0;

    async.whilst(function () {
      return started < pkg.drones;
    }, function (next) {
      started++;
      server.drone.start(pkg, next);
    }, done);
  }

  //
  // Find all drones in directory:
  //   %dir/%sanitized_name.json
  //
  fs.readdir(autostartDir, function (err, files) {
    if (err) {
      return callback(err);
    }

    async.map(files, function (file, next) {
      //
      // Read each `package.json` manifest file and start
      // the appropriate drones in this `haibu` instance.
      //
      fs.readFile(path.join(autostartDir, file), function (err, pkg) {
        if (err) {
          return callback(err);
        }

        //
        // Read the contents of the package.json manifest,
        // which should be JSON
        //
        try {
          pkg = JSON.parse(pkg.toString());
        }
        catch (ex) {
          return callback(ex);
        }

        startDrones(pkg, next);
      });
    }, callback);
  });
}

//
// ### function start (options, callback)
// #### @options {Object} Options to use when starting this module.
// #### @callback {function} Continuation to respond to when complete.
// Starts the haibu `drone` webservice with the specified options.
//
exports.start = function (options, callback) {
  if (exports.started) {
    return callback(null, haibu.running.server);
  }

  function tryAutostart (server) {
    exports.autostart(server, function (err) {
      //
      // Ignore errors from autostart and continue
      // bringing up the haibu `drone` server.
      //
      // Remark: We should report the `err` somewhere
      //
      haibu.emit('start');
      callback(null, server);
    });
  }

  function startServer (err, hook) {
    if (err) {
      return callback(err);
    }

    //
    // Create the server and add the new `http.Server`
    // and `haibu.drone.Drone` instance into the `haibu.running`
    // namespace.
    //
    var drone = new haibu.drone.Drone(options);

    //
    // Setup the `union` server through `flatiron.plugins.http`
    // and then add routes.
    //
    haibu.use(flatiron.plugins.http, options.http || {});
    require('./service').createRouter(drone);

    if (options.port) {
      haibu.listen(options.port);
    }

    haibu.running.server = haibu.server;
    haibu.running.hook   = hook;
    haibu.running.drone  = haibu.server.drone = drone;
    haibu.running.ports  = {};

    //
    // Attempt to autostart any applications and respond.
    //
    tryAutostart(haibu.server);
  }

  function startHook (err) {
    return err
      ? callback(err)
      : exports.startHook(options, startServer)
  }

  //
  // Indicate that `haibu.drone` has started
  //
  exports.started = true;
  
  return haibu.initialized
    ? startHook()
    : haibu.init(options, startHook);
};

//
// ### function stop (callback)
// #### @cleanup {bool} (optional) Remove all autostart files (default=true).
// #### @callback {function} Continuation to respond to when complete.
// Gracefully stops `drone` instance
//
exports.stop = function (cleanup, callback) {
  if (!callback && typeof cleanup === 'function') {
    callback = cleanup;
    cleanup = true;
  }

  if (!exports.started) {
    return callback ? callback() : null;
  }

  exports.started = false;

  haibu.running.server.close();
  haibu.running.hook.server.close();

  // Terminate drones
  haibu.running.drone.destroy(cleanup, callback || function () {});
  haibu.running = {};
};