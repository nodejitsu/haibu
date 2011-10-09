/*
 * zip.js: Implementation of the repository pattern for remote zip files.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var util = require('util'),
    exec = require('child_process').exec,
    haibu = require('../../haibu'),
    RemoteFile = require('./remote-file').RemoteFile;

//
// ### function Zip (app, options)
// #### @app {Object} The application to create the repository for
// #### @options {Object} Options to pass along to the repository
// Constructor function for the Zip repository.
//
var Zip = exports.Zip = function (app, options) {
  return RemoteFile.call(this, app, options);
};

// Inherit from the RemoteFile repository
util.inherits(Zip, RemoteFile);

//
// ### function init (callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Initializes this instance by checking the app, then installing
// npm dependencies, then downloading files located in repository
// to the target directory set on `this.appDir`
//
Zip.prototype.init = function (callback) {
  var self = this;

  haibu.emit('tar:get', 'info', {
    type: 'tar',
    user: self.app.user,
    name: self.app.name,
    protocol: self.app.repository.protocol,
    from: self.app.repository.url,
    to: self.appDir
  });

  this.fetch(function (err, packageFile) {
    if (err) {
      return callback(err);
    }

    var command = 'unzip -u ' + packageFile + ' -d ' + self.appDir;
    exec(command, function (err, stdout, stderr) {
      self.stat(function (err, exists) {
        if (err) {
          return callback(err);
        }

        self.installDependencies(function (err, packages) {
          if (err) {
            return callback(err);
          }

          var files = stdout.split('\n').splice(1).map(function (line) {
            return line.slice(13);
          });

          callback(null, true, packages, files);
        });
      });
    });
  });
};