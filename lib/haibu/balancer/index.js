/*
 * index.js: Responsible for balancing across all the instances available to haibu.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var http = require('http'),
    haibu = require('../../haibu');

//
// ### Include Exports
// Export other components in the module
//
exports.Balancer = require('./balancer').Balancer;

//
// ### function createServer (options)
// #### @options {Object} Options to use when creating this server
// Creates a server for the haibu `balancer` webservice.
//
exports.createServer = function (options, balancer) {
  balancer = balancer || new exports.Balancer(options);

  var server = http.createServer(function (request, response) {
    balancer.handle(request, response);
  });

  if (options.port) {
    server.listen(options.port);
  }

  balancer.once('ready', function (active) {
    server.emit('ready', active);
  });

  return server;
};

//
// ### function start (options, callback)
// #### @options {Object} Options to use when starting this module.
// #### @callback {function} Continuation to respond to when complete.
// Starts the haibu `balancer` webservice with the specified options.
//
exports.start = function (options, callback) {
  function startServer (err) {
    if (err) {
      return callback(err);
    }

    var balancer = new exports.Balancer(options),
        server = exports.createServer(options, balancer);

    balancer.once('ready', function (active) {
      callback(null, server, balancer, active);
    });
  }

  return options.init !== false
    ? haibu.init(options, startServer)
    : startServer();
};
