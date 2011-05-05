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
    haibu = require('haibu'),
    Repository = require('./repository').Repository;

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
      logfd: fs.createWriteStream(haibu.config.get('npm:log'), { flags: 'a+', encoding: 'utf8', mode: 0755 }),
      outfd: fs.createWriteStream(haibu.config.get('npm:out'), { flags: 'a+', encoding: 'utf8', mode: 0755 }),
      exit: false
    };
  }
  
  // Export npm and npm configuration
  this.npmConfig = options.npmConfig || npmConfig;

  // Check to see if we need to update things for chroot
  this.setChroot();
};

sys.inherits(Npm, Repository);

//
// ### function setChroot ()
// Updates the paths on the `npmConfig` object if 
// `chroot:enabled` is true.
//
Npm.prototype.setChroot = function () {
  //
  // If chroot is enabled then change the 'root' 
  // and 'binroot' directories for npm
  //
  // Using defaults 
  //  root:    /usr/local/lib/node
  //  binroot: /usr/local/bin
  //  tmp:     /tmp
  //
  if (haibu.config.get('chroot:enabled')) {
    var root = haibu.config.get('chroot:root');
    this.npmConfig.root    = path.join(root, 'usr', 'local', 'lib', 'node');
    this.npmConfig.binroot = path.join(root, 'usr', 'local', 'bin');
    this.npmConfig.tmproot = path.join(root, 'tmp');
  }  
};

//
// ### function unsetChroot () 
// Updates the paths on the `npmConfig` object 
// to their 'standard' locations.
//
Npm.prototype.unsetChroot = function () {
  npm.config.set('root', path.join('/usr', 'local', 'lib', 'node'));
  npm.config.set('binroot', path.join('/usr', 'local', 'bin'));
  npm.config.set('tmproot', '/tmp');
};

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
  
  npmInfo = { 
    out: this.npmConfig.outfd.path,
    log: this.npmConfig.logfd.path,
    exit: this.npmConfig.exit
  };
  
  if (haibu.config.get('chroot:enabled')) {
    npmInfo.root = npm.config.get('root');
    npmInfo.binroot = npm.config.get('binroot');
    npmInfo.tmproot = npm.config.get('tmproot');
  }
  
  haibu.emit('npm:load', 'info', npmInfo);
  
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
  this.allDependencies(function (err, dependencies) {
    if (err) {
      return callback(err);
    }
    else if (dependencies === true) {
      return callback(null, true, []);
    }
    
    haibu.emit('npm:install:start', 'info', { 
      app: self.app.name, 
      dependencies: dependencies
    });
    
    npm.commands.install(dependencies, function (err) {
      if (err) {
        return callback(err);
      }
      
      haibu.emit('npm:install:success', 'info', { app: self.app._id });
      callback(null, dependencies);
    });
  });
};

//
// ### function clean (callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Removes the directories for the app associated with this instance 
// then uninstalls the npm dependencies on this system.
//
Npm.prototype.clean = function (callback) {
  var self = this;
  this.rmdir(function (err) {
    if (err) {
      return callback(err);
    }
    
    self.allDependencies(function (err, dependencies) {
      haibu.emit('npm:uninstall:start', 'info', { app: self.app.name, dependencies: dependencies });
      npm.commands.uninstall(dependencies, function (err) {
        if (err) {
          return callback(err);
        }

        haibu.emit('npm:uninstall:success', 'info', { app: self.app._id });
        callback(null, dependencies);
      });    
    });
  });
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
    npm.commands.view(dependencies, function (err, list) {
      if (err) {
        return callback(err);
      }
      
      // TODO (indexzero): Recursively view each dependency and add their 
      // dependencies to the list to be uninstalled
      Object.keys(list).forEach(function (name) {
        // Remark (indexzero): This is a wierd API in npm, and will likely change
        var pkg = list[name][''];
        all = all.concat(Object.keys(pkg.dependencies));
      });
      
      callback(null, all);
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