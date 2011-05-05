/*
 * index.js: Top-level include for the drone module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var haibu = require('haibu');

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
    return err ? callback(err) : callback(null, exports.createServer(options));
  }

  return options.init !== false
    ? haibu.init(options, startServer)
    : startServer();
};