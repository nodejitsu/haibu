/*
 * local-file.js: Base implementation of the repository pattern for remote files.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var util = require('util'),
    fs = require('fs'),
    path = require('path'),
    exec = require('child_process').exec,
    haibu = require('../../haibu'),
    Repository = require('./repository').Repository;

//
// ### function LocalFile (app, options)
// #### @app {App} Application manifest to wrap
// #### @options {Object} Options for this instance
// Constructor function for the LocalFile Repository responsible for
// loading applications from a location on the local filesystem.
//
var LocalFile = exports.LocalFile = function (app, options) {
  var invalid = Repository.call(this, app, options);
  if (invalid) return invalid;

  options = options || {};
  this.packageDir = options.packageDir || haibu.config.get('directories:packages');
};

// Inherit from Repository
util.inherits(LocalFile, Repository);

//
// ### function validate ()
// #### @keys {Array||String} The keys to check in app. (i.e. 'scripts.start')
// #### @app {Object} (optional) The app object to check. if not given this.app will be used.
// #### @return {Error|| undefined} undefined if valid, Error if not
// Checks Application configuration attributes used by this repository type
//
LocalFile.prototype.validate = function (keys, app) {
  keys = keys || [];
  return Repository.prototype.validate.call(this, keys.concat('repository.directory'), app);
}

//
// ### function fetch (callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Checks to see if the app repo directorie exist.
//
LocalFile.prototype.fetch = function (callback) {
  var self = this,
      repoDir = this.app.repository.directory;

  fs.stat(repoDir, function (err) {
    callback(err, repoDir);
  });
};

//
// ### function init (callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Initializes this instance by checking the app, then copying the files located in
// `app.repository.directory` to the target directory set on `this.appDir`, then
// installing npm dependencies.
//
LocalFile.prototype.init = function (callback) {
  var self = this;

  haibu.emit('local:clone', 'info', {
    type: 'local',
    user: self.app.user,
    name: self.app.name,
    from: self.app.repository.directory,
    to: self.appDir
  });

  this.fetch(function (err, localDirectory) {
    if (err) {
      return callback(err);
    }

    exec('cp -r ' + localDirectory + ' ' + self.appDir, function (err) {
      self.stat(function (err, exists) {
        if (err) {
          return callback(err);
        }

        self.installDependencies(function (err, packages) {
          if (err) {
            return callback(err);
          }

          callback(null, true, packages);
        });
      });
    });
  });
};