/*
 * Tar.js: Implementation of the repository pattern for remote tar files.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs'),
    util = require('util'),
    zlib = require('zlib'),
    tar = require('tar'),
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

    var files = [];

    var extractor = new tar.Extract({ path: self.appDir });
    extractor.on('entry', function (entry) {
      files.push(entry.path);
    });

    fs.createReadStream(packageFile).pipe(zlib.Gunzip()).pipe(extractor).on('end', function () {
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

