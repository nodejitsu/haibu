/*
 * npm.js: Implementation of the repository pattern for npm packages.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var sys = require('sys'),
    fs = require('fs'),
    eyes = require('eyes'),
    path = require('path'),
    exec = require('child_process').exec,
    npm = require('npm'),
    npmout = require('npm/lib/utils/output'),
    npmls = require('npm/lib/utils/read-installed'),
    haibu = require('haibu'),
    Repository = require('./repository').Repository;

//
// Monkey patch `npmout.write()` so that we don't need log or out files
//
npmout.write = function () {
  var args = Array.prototype.slice.call(arguments),
      callback;

  args.forEach(function (arg) {
    if (typeof arg === 'function') {
      callback = arg;
    }
  });

  callback();
};

var npmConfig;

//
// ### function Npm (app, options)
// #### @app {Object} The application to create the repository for
// #### @options {Object} Options to pass along to the repository
// Constructor function for the Npm repository. 
//
var Npm = exports.Npm = function (app, options) {
  options = options || {};
  Repository.call(this, app, options);
  
  // If we haven't initialized npm config yet, do so.
  if (!npmConfig) {
    npmConfig = { 
      exit: false
    };
  }
  
  // Export npm and npm configuration
  this.npmConfig = options.npmConfig || npmConfig;
};

sys.inherits(Npm, Repository);

//
// ### function exists (callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Checks to see if the `appDir` on this instance exists on the file system.
//
Npm.prototype.exists = function (callback) {
  fs.stat(this.appDir, function (err, stats) {
    return err ? callback(err, false) : callback(null, false);
  });
};

//
// ### function loadDependencies (callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Loads npm and the dependencies for the app associted with this repository instance.
//
Npm.prototype.loadDependencies = function (callback) {
  var npmInfo, self = this;
  
  haibu.emit('npm:load', 'info', this.npmConfig);
  
  npm.load(this.npmConfig, function (err) {
    if (err) {
      haibu.emit('npm:load', 'error', { error: err.message });
      return callback(err);
    }
    
    haibu.emit('npm:load:success', 'silly');
    if (typeof self.app.dependencies === 'undefined' || Object.keys(self.app.dependencies).length === 0) {
      haibu.emit('npm:install:none', 'info', { app: self.app.name });
      return callback(null, true, []);
    }
    
    var dependencies = Object.keys(self.app.dependencies);
    haibu.emit('npm:install:load', 'info', { app: self.app.name, dependencies: dependencies });
    callback(null, dependencies);
  });
};

//
// ### function installDependencies (callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Installs the required npm dependencies for the app associated 
// with this repository instance on this system.
//
Npm.prototype.installDependencies = function (callback) {
  var self = this;
  this.loadDependencies(function (err, dependencies) {
    if (err) {
      return callback(err);
    }
    else if (dependencies === true) {
      return callback(null, true, []);
    }
    
    /* 
      Remark: Remove this until we can figure out the best way to make this work 
              with npm 1.0. chroot is still not working.
    
    //
    // If the app has no dependencies then set it to an empty array
    // and check to see if any plugins have required dependencies.
    //
    dependencies = Array.isArray(dependencies) ? dependencies : [];
    
    Object.keys(haibu.activePlugins).forEach(function (plugin) {
      if (haibu.activePlugins[plugin].modules) {
        dependencies = dependencies.concat(haibu.activePlugins[plugin].modules);
      }
    });
    
    if (dependencies.length === 0) {
      //
      // If there are no dependencies then respond with 
      // the appropriate arguments.
      //
      return callback(null, true, []);
    }
    */
    
    haibu.emit('npm:install:start', 'info', { 
      app: self.app.name, 
      dependencies: dependencies
    });

    npm.commands.install(self.homeDir, dependencies, function (err) {
      if (err) {
        return callback(err);
      }

      haibu.emit('npm:install:success', 'info', { app: self.app._id });
      callback(null, dependencies);
    });
  })
};

//
// ### function allDependencies (callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Gets the all of the dependencies for the app that this repository instance manages. 
//
Npm.prototype.allDependencies = function (callback) {
  var self = this;
  this.loadDependencies(function (err, dependencies) {
    if (err) {
      return callback(err);
    }
    else if (dependencies === true) {
      return callback(null, true, []);
    }
    
    var all = dependencies.slice(0);
    haibu.emit('npm:list', 'info', { app: self.app.name, dependencies: dependencies });
    npmls(self.homeDir, function (err, list) {
      if (err) {
        return callback(err);
      }
      
      callback(null, list && list.dependencies && Object.keys(list.dependencies));
    });
  });
};

//
// ### function init / update (callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Lightweight wrapper to `installDependencies` for consistency with other 
// Repository objects.
//
Npm.prototype.init = Npm.prototype.update = function (callback) {
  this.installDependencies(function (err, dependencies) {
    if (err) {
      return callback(err);
    }
    
    callback(null, true, dependencies);
  });
};