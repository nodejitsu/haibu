/*
 * Tar.js: Implementation of the repository pattern for remote tar files.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs'),
    util = require('util'),
    haibu = require('../../haibu'),
    RemoteFile = require('./remote-file').RemoteFile;

//
// ### function Tar (app, options)
// #### @app {Object} The application to create the repository for
// #### @options {Object} Options to pass along to the repository
// Constructor function for the Tar repository.
//
var Tar = exports.Tar = function (app, options) {
  return RemoteFile.call(this, app, options);
};

// Inherit from the RemoteFile repository
util.inherits(Tar, RemoteFile);

//
// ### function init (callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Initializes this instance by checking the app, then installing
// npm dependencies, then downloading files located in repository
// to the target directory set on `this.appDir`
//
Tar.prototype.init = function (callback) {
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

    var child = require('child_process').spawn('tar', ['-C', self.appDir, '-xzf', '-']),
        files = [];

    fs.createReadStream(packageFile).pipe(child.stdin);

    child.on('exit', function (statusCode) {
      if (statusCode) {
        return callback(new Error('tar exited with code: ' + statusCode));
      }

      self.stat(function (err, exists) {
        if (err) {
          return callback(err);
        }

        self.installDependencies(function (err, packages) {
          if (err) {
            return callback(err);
          }

          callback(null, true, packages, files);
        });
      });
    });
  });
};

