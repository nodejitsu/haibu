/*
 * npm.js: Implementation of the repository pattern for npm packages.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var util = require('util'),
    fs = require('fs'),
    haibu = require('../../haibu'),
    Repository = require('./repository').Repository;

//
// ### function Npm (app, options)
// #### @app {Object} The application to create the repository for
// #### @options {Object} Options to pass along to the repository
// Constructor function for the Npm repository.
//
var Npm = exports.Npm = function (app, options) {
  return Repository.call(this, app, options);
};

// Inherit from Repository.
util.inherits(Npm, Repository);

//
// ### function validate ()
// #### @keys {Array||String} The keys to check in app. (i.e. 'scripts.start')
// #### @app {Object} (optional) The app object to check. if not given this.app will be used.
// #### @return {Error|| undefined} undefined if valid, Error if not
// Checks Application configuration attributes used by this repository type
//
Npm.prototype.validate = function (keys, app) {
  keys = keys || [];
  return Repository.prototype.validate.call(this, keys.concat('repository.package'), app);
}

//
// ### function init (callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Installs the given `app.repository.package` with NPM to the appDir directory.
// REMARK: the application will be installed in this.homeDir + app.repository.package
// If the package has bin scripts they are installed by NPM in this.homeDir + '.bin'
//
Npm.prototype.init = function (callback) {
  var self = this;
  // fetch app from npm repository + install dependencies
  haibu.common.npm.install(this.appDir, [this.app.repository.package], function (err, dependencies) {
    if (err) {
      return callback(err);
    }

    self.stat(function (err, exists) {
      if (err) {
        return callback(err);
      }

      callback(null, true, dependencies);
    });
  });
};