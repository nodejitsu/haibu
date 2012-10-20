/*
 * git.js: Implementation of the repository pattern for remote git repositories.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var util = require('util'),
    path = require('path'),
    exec = require('child_process').exec,
    haibu = require('../../haibu'),
    Repository = require('./repository').Repository;

//
// ### function Git (app, options)
// #### @app {App} Application manifest to wrap
// #### @options {Object} Options for this instance
// Constructor function for the Git repository object. Responsible
// for cloning, and updating Git repositories.
//
var Git = exports.Git = function (app, options) {
  return Repository.call(this, app, options);
};

// Inherit from Repository
util.inherits(Git, Repository);

//
// ### function validate ()
// #### @keys {Array||String} The keys to check in app. (i.e. 'scripts.start')
// #### @app {Object} (optional) The app object to check. if not given this.app will be used.
// #### @return {Error|| undefined} undefined if valid, Error if not
// Checks Application configuration attributes used by this repository type
//
Git.prototype.validate = function (keys, app) {
  keys = keys || [];
  return Repository.prototype.validate.call(this, keys.concat('repository.url'), app);
}

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
    self.installDependencies(function (err, packages) {
      return err ? callback(err) : callback(null, true, packages);
    });
  }

  haibu.emit('git:clone', 'info', {
    type: 'git',
    user: self.app.user,
    name: self.app.name,
    from: self.app.repository.url,
    to: self.appDir
  });

  // TODO (indexzero): Validate the security of this regular expression since it is on the command line.
  var commands, match = self.app.repository.url.match(/\/([\w\-_\.]+)\.git$/);
  if (!match) {
    var err = new Error('Invalid git url: ' + self.app.repository.url);
    err.blame = {
      type: 'user',
      message: 'Repository configuration present but provides invalid Git URL'
    };
    return callback(err);
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

  commands[1] += ' && git submodule update --init --recursive';

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
          user: self.app.user
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
