/*
 * git.js: Implementation of the repository pattern for remote git repositories.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var sys = require('sys'), 
    path = require('path'),
    exec = require('child_process').exec,
    haibu = require('../../haibu'),
    Npm = require('./npm').Npm;

//
// ### function Git (app, options)
// #### @app {App} Application manifest to wrap
// #### @options {Object} Options for this instance
// Constructor function for the Git repository object. Responsible
// for cloning, and updating Git repositories.
//
var Git = exports.Git = function (app, options) {
  Npm.call(this, app, options);
};

// Inherit from the Npm repository.
sys.inherits(Git, Npm); 
  
//
// ### function init (callback) 
// #### @callback {function} Continuation to respond to.
// Initializes the git repository associated with the application
// and this instance. Checks out the specific branch in `app.repository.branch`
// if it exists. Initializes and updates git submodules. Initializes npm dependencies
// through calling `self.installDependencies`.
//
Git.prototype.init = function (callback) {
  var self = this;
  
  function installNpm () {
    self.installDependencies(function (err, installed, packages) {
      return err ? callback(err) : callback(null, true, packages);
    });
  }
    
    haibu.emit('git:clone', 'info', { 
    url: self.app.repository.url, 
    dir: self.appDir, 
    app: self.app.name,
    type: 'git',
    username: self.app.user
  });

  // TODO (indexzero): Validate the security of this regular expression since it is on the command line.
  var commands, match = self.app.repository.url.match(/\/([\w|\-|\_|\.|\d]+)\.git$/);
  if (!match) {
    return callback(new Error('Invalid git url: ' + self.app.repository.url));
  }

  // Set the home directory of the app managed by this instance.
  self._setHome(match[1]);

  // Setup the git commands to be executed 
  commands = [
    'cd ' + self.appDir + ' && git clone ' + self.app.repository.url,
    'cd ' + path.join(self.appDir, match[1])
  ];
  
  if (self.app.repository.branch) {
    commands[1] += ' && git checkout ' + self.app.repository.branch;
  }

  commands[1] += ' && git submodule init && git submodule update';

  function executeUntilEmpty() {
    var command = commands.shift();

    // Remark: Using 'exec' here because chaining 'spawn' is not effective here
    exec(command, function (err, stdout, stderr) {
      if (err !== null) {
        haibu.emit('git:clone', 'error', { 
          url: self.app.repository.url, 
          dir: self.appDir, 
          app: self.app.name,
          error: err.message,
          command: command, 
          type: 'git',
          username: self.app.user
        });
        
        callback(err, false);
      }
      else if (commands.length > 0) {
        executeUntilEmpty();
      }
      else if (commands.length === 0) {
        installNpm();
      }
    });
  }

  executeUntilEmpty();
};

//
// ### function update (callback) 
// #### @callback {function} Continuation to respond to.
// Updates the git repository associated with the application
// and this instance. Checks out the specific branch in `app.repository.branch`
// if it exists, then updates git submodules. Updates npm dependencies
// through calling `self.installDependencies`.
//
Git.prototype.update = function (callback) {
  var self = this, commands = [
    'cd ' + this.appDir + '/' + this.app.directories.home + ' && git pull ' + this.app.repository.url + ' ' + this.app.repository.branch || 'master',
    'cd ' + this.appDir + '/' + this.app.directories.home + ' && git submodule update'
  ];
  
  haibu.emit('git:update', 'info', { 
    url: self.app.repository.url, 
    dir: [self.appDir, this.app.directories.home].join('/'), 
    app: self.app.name,
    type: 'git',
    username: self.app.user
  });
  
  function executeUntilEmpty() {
    var command = commands.shift();
    
    // Remark: Using 'exec' here because chaining 'spawn' is not effective here
    exec(command, function (err, stdout, stderr) {
      if (err !== null) {
        haibu.emit('git:update', 'error', { 
          url: self.app.repository.url, 
          dir: [self.appDir, self.app.directories.home].join('/'), 
          app: self.app.name,
          error: err.message,
          command: command, 
          type: 'git',
          username: self.app.user
        });
        
        callback(err, false);
      }
      else if (commands.length > 0) {
        executeUntilEmpty();
      }
      else if (commands.length === 0) {
        self.installDependencies(function () {
          // Ignore errors right now
          callback(null, true);
        });
      }
    });
  }
  
  executeUntilEmpty();
};