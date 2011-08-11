/*
 * index.js: Top-level include for the drone module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs'),
    path = require('path'),
    async = require('async'),
    hookio = require('hook.io'),
    haibu = require('../../haibu');

//
// ### Include Exports
// Export other components in the module
//
exports.createRouter = require('./service').createRouter;
exports.Drone        = require('./drone').Drone;
exports.Client       = require('./client').Client;
exports.started      = false;

//
// ### function createServer (options)
// #### @options {Object} Options to use when creating this server
//
// Creates a server for the haibu `drone` webservice. 
//
exports.createServer = function (options) {
  var drone = new haibu.drone.Drone(options),
      router = haibu.drone.createRouter(drone),
      contentTypes = { 'application/json': router },
      server = haibu.utils.createServer({ contentTypes: contentTypes, port: options.port });
  
  server.drone = drone;
  return server;
};

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
  hook.listen(function (err) {
    haibu.running.hook = hook;
    return err ? callback(err) : callback(null, hook);
  });
};

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
  
  function startServer (err, hook) {
    if (err) {
      return callback(err);
    }
    
    //
    // Create the server and add the new `http.Server`
    // and `haibu.drone.Drone` instance into the `haibu.running`
    // namespace.
    //
    var server = exports.createServer(options);

    haibu.running.server = server;
    haibu.running.hook = hook;
    haibu.running.drone  = server.drone;
    haibu.running.ports  = {};
    
    autostart(function(package, callback) {
      if (package.drones == 0) return callback();

      var called = 0,
          errors = [];

      for (var i = 0; i < package.drones; i++) {
        server.drone.start(package, function(err) {
          // Collect errors
          if (err) errors.push(err);

          if (++called === package.drones) {
            callback(errors.length ? errors : null);
          }
        });
      }
    }, function(err) {
      // TODO: Report errors?
      callback(null, server);
    });
  }
  
  function startHook (err) {
    return err 
      ? callback(err)
      : exports.startHook(options.hook, startServer);
  }

  //
  // Autostart drones
  //
  function autostart(start, callback) {
    var dir = haibu.config.get('directories:autostart');

    // Find all drones in directory:
    //   %dir/%sanitized_name.json
    fs.readdir(dir, function(err, files) {
      if (err) return callback(err);

      async.map(files, function(file, callback) {
        // Read each file
        fs.readFile(dir + '/' + file, function(err, contents) {
          if (err) return callback(err);

          // Contents of file should be JSON
          try {
            contents = JSON.parse(contents.toString());
          } catch (e) {
            return callback(e);
          }

          start(contents, callback);
        });
      }, callback);
    });
  }

  //
  // Indicate that `haibu.drone` has started
  //
  exports.started = true;

  return options.init !== false
    ? haibu.init(options, startHook)
    : startHook();
};

//
// ### stop (callback)
// #### @cleanup {bool} (optional) Remove all autostart files (default=true).
// #### @callback {function} Continuation to respond to when complete.
// Gracefully stops `drone` instance
//
exports.stop = function (cleanup, callback) {
  if (!exports.started) return;

  if (typeof cleanup !== 'boolean') {
    callback = cleanup;
    cleanup = true;
  }

  exports.started = false;

  haibu.running.server.close();
  haibu.running.hook.server.close();

  // Terminate drones
  haibu.running.drone.destroy(cleanup, callback || function () {});
  haibu.running = {};
};
