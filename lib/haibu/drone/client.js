/*
 * client.js: API Client for the haibu Drone API.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var request = require('request');

// Failure HTTP Response codes based
// off of `/lib/haibu/drone/service.js`
var failCodes = {
  400: 'Bad Request',
  404: 'Item not found',
  500: 'Internal Server Error'
};

// Success HTTP Response codes based
// off of `/lib/haibu/drone/service.js`
var successCodes = {
  200: 'OK'
};

//
// ### function Client (options)
// #### @options {Object} Options to use for this instance.
// Constructor function for the Client to the haibu Haibu server.
//
var Client = exports.Client = function (options) {
  if (!options.host) {
    throw new Error('options.host is required.');
  }

  //
  // TODO (indexzero): Configure the drone port globally somewhere.
  //
  this.options = options;
  this.options.port = this.options.port || 9002;
};

//
// ### function get (name, callback)
// #### @name {string} name of the application to get from the Haibu server.
// #### @callback {function} Continuation to pass control back to when complete.
// Gets the data about all the drones for the app with the specified `name`
// on the remote Haibu server.
//
Client.prototype.get = function (name, callback) {
  this._request('GET', '/drones/' + name, callback, function (res, result) {
    callback(null, result);
  });
};

//
// ### function start (app, callback)
// #### @app {Object} Application to start on the Haibu server.
// #### @callback {function} Continuation to pass control back to when complete.
// Starts the the app with the specified `app.name` on the remote Haibu server.
//
Client.prototype.start = function (app, callback) {
  this._request('POST', '/drones/' + app.name + '/start', { start: app }, callback, function (res, result) {
    callback(null, result);
  });
};

//
// ### function stop (name, callback)
// #### @name {string} Name of the application to stop on the Haibu server.
// #### @callback {function} Continuation to pass control back to when complete.
// Stops the application with the specified `name` on the remote Haibu server.
//
Client.prototype.stop = function (name, callback) {
  this._request('POST', '/drones/' + name + '/stop', { stop: { name: name } }, callback, function (res, result) {
    callback(null, null);
  });
};

//
// ### function restart (name, callback)
// #### @name {string} Name of the application to restart on the Haibu server.
// #### @callback {function} Continuation to pass control back to when complete.
// Restarts the application with the specified :id on the remote Haibu server.
//
Client.prototype.restart = function (name, callback) {
  this._request('POST', '/drones/' + name + '/restart', { restart: { name: name } }, callback, function (res, result) {
    callback(null, result.drones);
  });
};

//
// ### function clean (app, callback)
// #### @app {Object} Application to clean on the Haibu server.
// #### @callback {function} Continuation to pass control back to when complete.
// Attempts to clean the specified `app` from the Haibu server targeted by this instance.
//
Client.prototype.clean = function (app, callback) {
  this._request('POST', '/drones/' + app.name + '/clean', app, callback, function (res, result) {
    callback(null, result);
  });
};

//
// ### function cleanAll (app, callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Attempts to clean the all applications from the Haibu server targeted by this instance.
//
Client.prototype.cleanAll = function (callback) {
  this._request('POST', '/drones/cleanall', callback, function (res) {
    callback();
  });
};

//
// ### @remoteUri {string}
// Full URI for the remote Haibu server this client
// is configured to request against.
//
Client.prototype.__defineGetter__('remoteUri', function () {
  return 'http://' + this.options.host + ':' + this.options.port;
});

//
// ### @private _request (method, uri, [body], callback, success)
// #### @method {string} HTTP verb to request with
// #### @uri {string} Path to request on the Haibu server
// #### [@body] {Object} JSON object to use as the body of the request
// #### @callback {function} Continuation to short-circuit to if request is unsuccessful.
// #### @success {function} Continuation to call if the request is successful
// Core method for making requests against the haibu Drone API. Flexible with respect
// to continuation passing given success and callback.
//
Client.prototype._request = function (method, uri /* variable arguments */) {
  var options, args = Array.prototype.slice.call(arguments),
      success = args.pop(),
      callback = args.pop(),
      body = typeof args[args.length - 1] === 'object' && args.pop();

  options = {
    method: method || 'GET',
    uri: this.remoteUri + uri,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  request(options, function (err, response, body) {
    if (err) {
      return callback(err);
    }

    var error, result, statusCode = response.statusCode.toString();
    try {
      result = JSON.parse(body);
    }
    catch (ex) {
      // Ignore Errors
    }

    if (Object.keys(failCodes).indexOf(statusCode) !== -1) {
      error = new Error('haibu Error (' + statusCode + '): ' + failCodes[statusCode]);
      error.result = result;
      return callback(error);
    }

    success(response, result);
  });
};
