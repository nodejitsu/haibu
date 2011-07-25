/*
 * index.js: Top-level include for the drone module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var path = require('path'),
    haibu = require('haibu'),
    hookio = require('hook.io'),
    socket = require('../utils/socket');

//
// ### Include Exports
// Export other components in the module
//
exports.createRouter = require('./service').createRouter;
exports.Drone        = require('./drone').Drone;
exports.Client       = require('./client').Client;

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
  // ToDo is this where we want the drone's hook to start?
  // options.hook.debug = true;
  options.hook.name = 'drone-hook';
  server.hook = new hookio.Hook(options.hook);
  server.hook.start();
  return server;
};

//
// ### function start (options, callback)
// #### @options {Object} Options to use when starting this module.
// #### @callback {function} Continuation to respond to when complete.
// Starts the haibu `drone` webservice with the specified options.
//
exports.start = function (options, callback) {
  function startServer (err) {
    //
    // Create the server and add the new `http.Server`
    // and `haibu.drone.Drone` instance into the `haibu.running`
    // namespace.
    //
    var server = exports.createServer(options);
    haibu.running = haibu.running || {
      server: server,
      drone: server.drone,
      hook: server.hook,
      ports: {
        //id : {desired: actual}
      }
    };
    
    return err ? callback(err) : callback(null, server);
  }

  return options.init !== false
    ? haibu.init(options, startServer)
    : startServer();
};
