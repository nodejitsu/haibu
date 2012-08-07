/*
 * npm.js: Simple utilities for working with npm.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var npm = require('npm'),
    npmout = npmout = require('npm/lib/utils/output'),
    haibu = require('../../haibu');

var npmConfig = {
  _exit: false,
  exit: false,
  'unsafe-perm': true,
  loglevel: "silent",
  production: true
};

//
// Monkey patch `npmout.write()` so that we don't need log or out files
//
npmout.write = function () {
  var args = Array.prototype.slice.call(arguments),
      message = '',
      callback;

  args.forEach(function (arg) {
    if (typeof arg === 'function') {
      callback = arg;
    }
    else {
      message += arg;
    }
  });

  haibu.emit('npm:output', 'info', { info: message });
 
  if (callback) {
    callback();
  }
};

//
// ### function load (callback)
// #### @callback {function} Continuation to respond to when complete.
// Loads npm with the default `npmConfig`.
//
exports.load = function (callback) {
  haibu.emit('npm:load', 'info', haibu.common.clone(npmConfig));
  npm.load(npmConfig, function (err) {
    if (err) {
      haibu.emit('npm:load', 'error', { error: err.message });
      return callback(err);
    }

    haibu.emit('npm:load:success', 'silly');
    callback();
  });
};

//
// ### function loadDependencies (callback)
// #### @app {Object} Application to load dependencies for
// #### @callback {function} Continuation to pass control back to when complete.
// Loads npm and the dependencies for the target `app`
//
exports.loadDependencies = function (app, callback) {
  var self = this;
  exports.load(function (err) {
    if (err) {
      return callback(err);
    }

    if (typeof app.dependencies === 'undefined' || Object.keys(app.dependencies).length === 0) {
      haibu.emit('npm:install:none', 'info', { 
        app: app.name, 
        user: app.user 
      });
      
      return callback(null, true, []);
    }

    var dependencies = Object.keys(app.dependencies);
    haibu.emit('npm:install:load', 'info', { 
      app: app.name, 
      user: app.user, 
      dependencies: dependencies
    });
    
    callback(null, dependencies);
  });
};

//
// ### function install (dir, target, callback)
// #### @dir {string} Directory to install targets into.
// #### @target {Object|Array} Target dependencies or application to install.
// #### @callback {function} Continuation to pass control back to when complete.
// Install the `target` dependencies, either an Array of dependencies or a package.json
// manifest with potential dependencies.
//
exports.install = function (dir, target, callback) {
  if (!dir) {
    var err = new Error('Cannot install npm dependencies without a target directory.');
    err.blame = {
      type: 'system',
      message: 'NPM configuration'
    }
    return callback();
  }

  var meta = {};

  //
  // Install all dependencies into the target directory
  //
  function installAll(deps) {
    npm.commands.install(dir, deps, function (err) {
      if (err) {
        return callback(err);
      }

      haibu.emit('npm:install:success', 'info', meta);
      callback(null, deps);
    });
  }

  //
  // Loads all dependencies for the `app` manifest and then installs
  // them into the target directory.
  //
  function loadAppAndInstall(app) {
    exports.loadDependencies(target, function (err, dependencies) {
      if (err) {
        return callback(err);
      }
      else if (dependencies === true) {
        return callback(null, []);
      }

      meta = {
        app: target.name,
        dependencies: dependencies
      };

      haibu.emit('npm:install:start', 'info', meta);
      installAll(dependencies);
    });
  }

  //
  // Load npm and install the raw list of dependencies
  //
  function loadAndInstall() {
    meta = { packages: target };
    exports.load(function (err) {
      if (err) {
        return callback(err);
      }

      installAll(target);
    });
  }

  return Array.isArray(target)
    ? loadAndInstall()
    : loadAppAndInstall();
};
