/*
 * Tar.js: Implementation of the repository pattern for remote tar files.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */
 
var inherits = require('util').inherits,
    exec = require('child_process').exec,
    RemoteFile = require('./remote-file').RemoteFile;

//
// ### function Tar (app, options)
// #### @app {Object} The application to create the repository for
// #### @options {Object} Options to pass along to the repository
// Constructor function for the Tar repository. 
//
var Tar = exports.Tar = function (app, options) {
  RemoteFile.call(this, app, options);
};

// Inherit from RemoteFile repository
inherits(Tar, RemoteFile);

//
// ### function init (callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Initializes this instance by checking the app, then installing
// npm dependencies, then downloading files located in repository
// to the target directory set on `this.appDir`
//
Tar.prototype.init = function (callback) {
  var self = this;  
  this.fetch(function (err, packageFile) {
    if (err) {
      return callback(err);
    }

    var command = 'tar -xzvf ' + packageFile + ' -C ' + self.appDir;
    exec(command, function (err, stdout, stderr) {
      self.stat(function (err, exists) {
        if (err) {
          return callback(err);
        }
        
        self.installDependencies(function (err, installed, packages) {
          if (err) {
            return callback(err);
          }
        
          var files = stderr.split('\n').map(function (line) { 
            return line.slice(2);
          });
        
          callback(null, true, packages, files);
        });
      });
    });
  });
};