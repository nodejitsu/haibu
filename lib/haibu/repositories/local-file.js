/*
 * local-file.js: Base implementation of the repository pattern for remote files.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    exec = require('child_process').exec,
    haibu = require('../../haibu'),
    Npm = require('./npm').Npm;

//
// ### function LocalFile (app, options)
// #### @app {App} Application manifest to wrap
// #### @options {Object} Options for this instance
// Constructor function for the LocalFile Repository responsible for 
// loading applications from a location on the local filesystem.
//
var LocalFile = exports.LocalFile = function (app, options) {
  Npm.call(this, app, options);

  options = options || {};
  this.packageDir = options.packageDir || haibu.config.get('directories:packages');
};

// Inherit from Npm Repository
sys.inherits(LocalFile, Npm);

//
// ### function fetch (callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Checks to see if the app associated with this instance has the requisite properties
// and that the associated directories exist.
//
LocalFile.prototype.fetch = function (callback) {
  // Ensure that a valid app was passed into the constructor
  if (this.app && this.app.repository && this.app.repository.directory) {
    var appDir = this.app.repository.directory;
    fs.stat(appDir, function (err) {
      callback(err, appDir);
    });
  } 
  else {
    callback(new Error("'app.repository.directory' not specified"));
  }
};

//
// ### function init (callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Initializes this instance by checking the app, then installing
// npm dependencies, then copying the files located in `app.repository.directory`
// to the target directory set on `this.appDir`
//
LocalFile.prototype.init = function (callback) {
  var self = this;
  this.fetch(function (err, localDirectory) {
    if (err) {
      return callback(err);
    }
    
    self._setHome(path.basename(localDirectory));
    self.installDependencies(function (err, installed, packages) {
      if (err) {
        return callback(err);
      }
      
      exec('cp -r ' + localDirectory + ' ' + self.appDir, function (err) {
        if (err) {
          return callback(err);
        }

        self.stat(function (statErr, exists) {
          if (statErr) {
            return callback(statErr);
          }

          fs.readdir(self.appDir, function () {
            callback(null, true, packages);
          });
        });
      });
    });
  });
};