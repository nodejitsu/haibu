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
    haibu = require('../../haibu'),
    async = haibu.common.async;

//
// ### Include Exports
// Export other components in the module
//
exports.Drone   = require('./drone').Drone;
exports.Client  = require('haibu-api').Client;
exports.started = false;

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

  function startServer (err) {
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
    haibu.running.drone  = haibu.server.drone = drone;
    haibu.running.ports  = {};

    //
    // There is a current bug in node that throws here:
    //
    // https://github.com/joyent/node/blob/v0.4.12/lib/net.js#L159
    //
    // It will throw a broken pipe error (EPIPE) when a child process that you 
    // are piping to unexpectedly exits. The write function on line 159 is 
    // defined here:
    //
    // https://github.com/joyent/node/blob/v0.4.12/lib/net.js#L62
    //
    // This uncaughtExceptionHandler will catch that error,
    // and since it originated with in another sync context,
    // this section will still respond to the request.
    //
    haibu.plugins.exceptions.logger.exitOnError = function (err) {
      if (err.code === 'EPIPE') {
        console.log('expected error:');
        console.log('EPIPE -- probabaly caused by someone pushing a non gzip file.');
        console.log('"net" throws on a broken pipe, current node bug, not haibu.');
        return false;
      }

      return true;
    };

    //
    // Attempt to autostart any applications and respond.
    //
    tryAutostart(haibu.server);
  }

  //
  // Indicate that `haibu.drone` has started
  //
  exports.started = true;
  
  return haibu.initialized
    ? startServer()
    : haibu.init(options, startServer);
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
  
  // Terminate drones
  haibu.running.drone.destroy(cleanup, callback || function () {});
  haibu.running = {};
};