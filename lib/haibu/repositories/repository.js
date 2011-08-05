/*
 * repository.js: Base implementation of the repository pattern.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */
 
var fs = require('fs'),
    path = require('path'),
    haibu = require('../../haibu');

//
// ### function Repository (app, options)
// #### @app {Object} The application to create the repository for
// #### @options {Object} Options to pass along to the repository
// Constructor function for the Repository base object. This contains
// the core implementations used by inherited prototypes in the 
// `repositories` module.
//
var Repository = exports.Repository = function (app, options) {
  options = options || {};
  
  this.app = app;
  this.app._id = app.name.replace(' ', '-');
  this.appsDir = options.appsDir || haibu.config.get('directories:apps');
};

Repository.prototype.stat = function (callback) {
  var self = this;
  
  //
  // Assume that there is ONLY one directory allowed in each application directory. 
  // ex:
  //   /local
  //   /local/:username
  //   /local/:username/:appname
  //   /local/:username/:appname/:home
  // 
  // By making this assumption we can infer the home directory immediately at run-time for 
  // all possible package.json repository types and remotes. 
  //
  fs.readdir(this.appDir, function (err, files) {
    if (err) {
      // Since we couldn't find the directory we need to pass it to addDir
      haibu.emit('repo:dir:notfound', 'warn', { app: self.app.name, dir: self.appDir });
      callback(err, false);
    }
    else if (files.length === 0) {
      haibu.emit('repo:dir:empty', 'warn', { app: self.app.name, dir: self.appDir });
      callback(new Error('Application directory is empty'));
    }
    else {
      // Now that we know the home directory, set it on the app managed by this repository
      var sourceDir = path.join(self.appDir, files[0]);
      self._setHome(files[0]);
      
      haibu.emit('repo:dir:exists', 'info', { app: self.app.name, dir: sourceDir });
      callback(null, true);
    }
  });
};

//
// ### function mkdir (callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Creates directories for the applications and userspaces for the app 
// associated with this repository instance.
//
Repository.prototype.mkdir = function (callback) {
  var self = this;
  haibu.emit('repo:dir:user:create', 'info', { app: self.app.name, dir: this.userDir });

  // check if the user's folder already exists
  fs.stat(self.userDir, function (userErr, stats) {
    function createAppDir() {
      haibu.emit('repo:dir:app:create', 'info', { app: self.app.name, dir: self.appDir });

      // check if the application's folder already exists
      fs.stat(self.appDir, function (droneErr, stats) {
        if (droneErr) { // folder doesn't exist
          return fs.mkdir(self.appDir, 0755, function (mkAppErr) {
            if (mkAppErr) {
              haibu.emit('repo:dir:app:create', 'error', { app: self.app.name, dir: self.appDir });
              return callback(mkAppErr, false);
            }
            
            // If we created the directory successfully callback with true
            haibu.emit('repo:dir:app:success', 'info', { app: self.app.name, dir: self.appDir });
            return callback(null, true);
          });
        }
        
        return callback(null, true);
      });
    }
    
    if (userErr) { 
      return fs.mkdir(self.userDir, 0755, function (mkUserErr) {
        if (mkUserErr) {
          haibu.emit('repo:dir:user:create', 'error', { app: self.app.name, dir: self.userDir });
          return callback(mkUserErr, false);
        }

        haibu.emit('repo:dir:user:success', 'info', { app: self.app.name, dir: self.userDir });
        return createAppDir();
      });
    }
    
    createAppDir();
  });  
};

//
// ### function bootstrap (callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Bootstraps the files on the local system for this instance.
// If the files already exist, it simply responds.  
//
Repository.prototype.bootstrap = function (callback) {
  var self = this;
  this.stat(function (err, exists) {
    if (err) {
      return self.mkdir(function (err, created) {
        callback(null, false);
      });
    }
    
    // If it already exists assume mkdir and init have also been called
    callback(null, true);
  });
};

//
// ### @userDir {string}
// Location on disk of all the apps for the user who this 
// repository instance manages
//
Repository.prototype.__defineGetter__('userDir', function () {
  return path.join(this.appsDir, this.app.user);
});

//
// ### @appDir {string}
// Location on disk of the app for the user who this 
// repository instance manages.
//
Repository.prototype.__defineGetter__('appDir', function () {
  return path.join(this.userDir, this.app.name);
});

//
// ### @homeDir {string}
// Location on disk of the home directory for the app
// that this repository instance manages.
//
Repository.prototype.__defineGetter__('homeDir', function () {
  if (!this.app.directories || !this.app.directories.home) {
    return null;
  }
  
  return path.join(this.appDir, this.app.directories.home);
});

//
// ### @startScript {string}
// Location on disk of all the start script for the app 
// that this repository instance manages
//
Repository.prototype.__defineGetter__('startScript', function () {
  if (!this.homeDir) {
    return null;
  }
  
  return path.join(this.homeDir, this.app.scripts.start);
});

//
// ### @private function _setHome (path)
// @path {string} The home directory to set for this instance
// Sets the home directory for this instance to the specified path.
//
Repository.prototype._setHome = function (path) {
  this.app.directories = this.app.directories || {};
  this.app.directories.home = path;
};