/*
 * remote-file.js: Base implementation of the repository pattern for remote files.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    url = require('url'),
    request = require('request'),
    cloudfiles = require('cloudfiles'),
    haibu = require('haibu'),
    Npm = require('./npm').Npm;

//
// ### function RemoteFile (app, options)
// #### @app {Object} The application to create the repository for
// #### @options {Object} Options to pass along to the repository
// Constructor function for the RemoteFile repository responsible for 
// downloading files from remote locations. 
//
// Currently supported remotes are:
// * HTTP / HTTPS
// * Cloudfiles
//
var RemoteFile = exports.RemoteFile = function (app, options) {
  Npm.call(this, app, options);
  
  options = options || {};
  this.packageDir = options.packageDir || haibu.config.get('directories:packages');

  if (app.repository.protocol === 'cloudfiles') {
    if (!app.repository.auth) {
      throw new Error('Cannot create CloudFiles backed RemoteFile repository without auth');
    }
    
    this.client = cloudfiles.createClient({ auth: app.repository.auth }); 

    // Configure cloudfiles to make it's local cache directory
    // the same as haibu's packages directory 
    this.client.config.cache.path = this.packageDir;
  }
};

// Inherit from the Npm Repository
sys.inherits(RemoteFile, Npm);

//
// ### function fetch (callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Fetches the file(s) associated with the repository from the remote location
// based on `app.repository.protocol`.
//
RemoteFile.prototype.fetch = function (callback) {
  var protocol = this.app.repository.protocol, options;
  
  if (protocol === 'http' || protocol === 'https') {
    this.fetchHttp(this.app.repository.url, callback);
  } 
  else if (protocol === 'cloudfiles') {
    options = {
      container: this.app.repository.container,
      filename: this.app.repository.filename
    };
    
    this.fetchCloudfiles(options, callback);
  }
  else {
    callback(new Error('Cannot fetch app with unknown protocol: ' + this.app.repository.protocol));
  }
};

//
// ### function fetchCloudfiles (options, callback)
// #### @options {Object} Options for the Cloudfiles remote
// #### @callback {function} Continuation to pass control back to when complete.
// Fetches the file specified by `options.filename` from the Rackspace Cloudfiles
// container specified by `options.container` then saves it to the local packages cache.
//
RemoteFile.prototype.fetchCloudfiles = function (options, callback) {
  var self = this;
  this.client.setAuth(function () {
    self.client.getFile(options.container, options.filename, function (err, file) {
      if (err) {
        return callback(err);
      }

      callback(null, path.join(self.client.config.cache.path, options.container, options.filename));
    });
  });
};

//
// ### function fetchHttp (remotePath, callback)
// #### @remotePath {string} Location of the remote HTTP/HTTPS file
// #### @callback {function} Continuation to pass control back to when complete.
// Fetches the file specified by `remotePath` then saves it to the local packages cache.
//
RemoteFile.prototype.fetchHttp = function (remotePath, callback) {
  var self = this, out,
      filename = url.parse(remotePath).pathname.split('/').pop(),
      localFile = path.join(this.packageDir, filename),
      localStream = fs.createWriteStream(localFile);

  out = request({ uri: remotePath });
  out.pipe(localStream);
  localStream.once('close', function () {
    callback(null, localFile);
  });
};