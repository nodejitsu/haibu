/*
 * index.js: Top-level include for the drone module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var path = require('path'),
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
      server = haibu.utils.createServer(contentTypes, false, options.port);
  
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
    haibu.running.drone  = server.drone;
    haibu.running.ports  = {};
    
    return callback(null, server);
  }
  
  function startHook (err) {
    return err 
      ? callback(err)
      : exports.startHook(options.hook, startServer);
  }

  //
  // Indicate that `haibu.drone` has started
  //
  exports.started = true;

  return options.init !== false
    ? haibu.init(options, startHook)
    : startHook();
};
