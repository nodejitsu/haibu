/*
 * npm.js: Implementation of the repository pattern for npm packages.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var sys = require('sys'),
    fs = require('fs'),
    eyes = require('eyes'),
    path = require('path'),
    exec = require('child_process').exec,
    haibu = require('haibu'),
    Repository = require('./repository').Repository;

//
// ### function Npm (app, options)
// #### @app {Object} The application to create the repository for
// #### @options {Object} Options to pass along to the repository
// Constructor function for the Npm repository. 
//
var Npm = exports.Npm = function (app, options) {
  options = options || {};
  Repository.call(this, app, options);  
};

sys.inherits(Npm, Repository);

//
// ### function exists (callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Checks to see if the `appDir` on this instance exists on the file system.
//
Npm.prototype.exists = function (callback) {
  fs.stat(this.appDir, function (err, stats) {
    return err ? callback(err, false) : callback(null, false);
  });
};

//
// ### function installDependencies (callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Installs the required npm dependencies for the app associated 
// with this repository instance on this system.
//
Npm.prototype.installDependencies = function (callback) {
  haibu.utils.npm.install(this.homeDir, this.app, callback);
};

//
// ### function allDependencies (callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Gets the all of the dependencies for the app that this repository instance manages. 
//
Npm.prototype.allDependencies = function (callback) {
  haibu.utils.npm.list(this.homeDir, this.app, callback);
};

//
// ### function init / update (callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Lightweight wrapper to `installDependencies` for consistency with other 
// Repository objects.
//
Npm.prototype.init = Npm.prototype.update = function (callback) {
  this.installDependencies(function (err, dependencies) {
    if (err) {
      return callback(err);
    }
    
    callback(null, true, dependencies);
  });
};