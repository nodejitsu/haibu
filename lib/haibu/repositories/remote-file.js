/*
 * remote-file.js: Base implementation of the repository pattern for remote files.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var util = require('util'),
    fs = require('fs'),
    path = require('path'),
    url = require('url'),
    request = require('request'),
    cloudfiles = require('cloudfiles'),
    haibu = require('../../haibu'),
    knox = require('knox'),
    Repository = require('./repository').Repository;

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
  var invalid = Repository.call(this, app, options);
  if (invalid) {
    return invalid;
  }

  options = options || {};
  this.packageDir = options.packageDir || haibu.config.get('directories:packages');
};

// Inherit from Repository
util.inherits(RemoteFile, Repository);

//
// ### function validate ()
// #### @keys {Array||String} The keys to check in app. (i.e. 'scripts.start')
// #### @app {Object} (optional) The app object to check. if not given this.app will be used.
// #### @return {Error|| undefined} undefined if valid, Error if not
// Checks Application configuration attributes used by this repository type
//
RemoteFile.prototype.validate = function (keys, app) {
  keys = keys || [];

  var test = app && app.repository && app.repository.protocol === 'cloudfiles'
       ? ['repository.auth', 'repository.container', 'repository.filename']
       : ['repository.url'];

  return Repository.prototype.validate.call(this, keys.concat('repository.protocol', test), app);
};

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
  else if (protocol === 's3') {
    this.fetchS3(this.app.repository.url, callback);
  }
  else {
    var err = new Error('Cannot fetch app with unknown protocol: ' + this.app.repository.protocol);
    err.blame = {
      type: 'user',
      message: 'Unknown protocol to fetch the repository from'
    }
    callback(err);
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

  this.client = cloudfiles.createClient({ auth: this.app.repository.auth });

  // Configure cloudfiles to make it's local cache directory
  // the same as haibu's packages directory
  this.client.config.cache.path = this.packageDir;

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
// ### function fetchCloudfiles (options, callback)
// #### @options {Object} Options for the Cloudfiles remote
// #### @callback {function} Continuation to pass control back to when complete.
// Fetches the file specified by `options.filename` from the Rackspace Cloudfiles
// container specified by `options.container` then saves it to the local packages cache.
//
RemoteFile.prototype.fetchS3 = function (filename, callback) {
  var self = this,
      localFile = path.join(this.packageDir, filename),
      localStream = fs.createWriteStream(localFile),
      done = false,
      client = knox.createClient(this.app.repository.auth);

  client.get(filename).on('response', function (res) {
    if (done) return;
    done = true;
    localStream.once('close', function () {
      callback(null, localFile);
    });
    res.pipe(localStream);
  }).on('error', function (e) {
    if (done) return;
    done = true;
    localStream.end();
    callback(e);
  }).end();
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