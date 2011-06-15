/*
 * spawner.js: Responsible for checking, downloading, and spawning drones
 *             inside of carapace objects.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs'),
    path = require('path'),
    forever = require('forever'),
    haibu = require('haibu');

//
// ### Port Management Constants
// TODO (indexzero): Stop using these / make them more intelligent
// and / or configurable.
//
var ports = {},
    lastPort = 8000;

//
// ### function Spawner (options)
// #### @options {Object} Options for this instance.
// Constructor function for the Spawner object. Controls the
// low-level aspects of the life-cycle of applications running
// inside of haibu.
//
var Spawner = exports.Spawner = function (options) {
  options = options || {};

  this.maxRestart = options.maxRestart;
  this.minUptime  = options.minUptime;
  this.silent     = options.silent     || false;
  this.appsDir    = options.appsDir    || haibu.config.get('directories:apps');
  this.packageDir = options.packageDir || haibu.config.get('directories:packages');
  this.host       = options.host       || '127.0.0.1';
};


//
// ### function bindPort (app)
// #### @app {App} Application to bind a port for
// Gets a free port for the requesting application to bind to.
//
// Remark (indexzero): Move this into carapace with shared data for this instance ... ALFRED!!!
//
Spawner.prototype.bindPort = function (app) {
  lastPort += 1;
  var port = lastPort;
  ports[port] = app;
  return port;
};

//
// ### function releasePort (port)
// #### @port {int} The port to relase.
// Releases the port if it is bound to an application.
//
// Remark (indexzero): Move this into carapace with shared data for this instance ... ALFRED!!!
//
Spawner.prototype.releasePort = function (port) {
  if (ports[port]) {
    delete ports[port];
    return true;
  }

  return false;
};

//
// ### function trySpawn (app, callback)
// #### @app {App} Application to attempt to spawn on this server.
// #### @callback {function} Continuation passed to respond to.
// Attempts to spawn the application with the package.json manifest
// represented by @app, then responds to @callback.
//
Spawner.prototype.trySpawn = function (app, callback) {
  var self = this, repo;
  repo = app instanceof haibu.repository.Repository ? app : haibu.repository.create(app);
  repo.bootstrap(function (err, existed) {
    if (err) {
      return callback(err);
    }
    else if (existed) {
      return self.spawn(repo, callback);
    }

    repo.init(function (err, inited) {
      if (err) {
        return callback(err);
      }

      self.spawn(repo, callback);
    });
  });
};

Spawner.prototype.spawnOptions = function (repo, host, port) {
  return {
    carapace: path.join(__dirname, '..', '..', '..', 'bin', 'carapace'),
    drone: [repo.startScript, host, port]
  };
};

//
// ### function spawn (repo, callback)
// #### @repo Repository object initialized with target application to spawn.
// #### @callback Continuation passed to respond to.
// Does the heavy lifting for creating a Forever Monitor to be managed by haibu.
// Reads configuration from haibu, and the repository and calls the appripriate
// internal APIs.
//
Spawner.prototype.spawn = function (repo, callback) {
  haibu.emit('spawn:setup', 'info', { app: repo.app.id, username: repo.app.user });

  var self = this, drone, options, port, result,
      foreverOptions, meta, errState, errMsg = '', responded;

  port = this.bindPort();

  // Setup meta logging information
  meta = { app: repo.app.name, user: repo.app.user };

  Object.keys(haibu.activePlugins).forEach(function (plugin) {
    if (!options && haibu.activePlugins[plugin].spawnOptions) {
      options = haibu.activePlugins[plugin].spawnOptions(repo, self.host, port);
    }
  });

  if (!options) {
    options = this.spawnOptions(repo, this.host, port);
  }

  //
  // Before we attempt to spawn, let's check if the startPath actually points to a file
  // Trapping this specific error is useful as the error indicates an incorrect
  // scripts.start property in the package.json
  //
  fs.stat(repo.startScript, function (err, stats) {
    if (err) {
      return callback(new Error('package.json error: ' + 'can\'t find starting script: ' + repo.app.scripts.start));
    }

    haibu.emit('spawn:start', 'info', { options: options.drone.join(' '), app: meta.app, user: meta.user });
    foreverOptions = {
      minUptime: self.minUptime,
      options: options.drone,
      silent: true,
      spawnWith: {
        cwd: repo.homeDir
      }
    };

    foreverOptions.forever = typeof self.maxRestart === 'undefined';
    if (typeof self.maxRestart !== 'undefined') {
      foreverOptions.max = self.maxRestart;
    }

    drone = new forever.Monitor(options.carapace, foreverOptions);

    //
    // TODO (indexzero): This output should be in its own Loggly input (i.e. log.user instead of log.drone)
    //
    drone.on('stdout', function (data) {
      haibu.emit('drone:stdout', 'info', data.toString(), meta);
    });

    drone.on('stderr', function (data) {
      if (!responded) {
        errMsg += data + '\n';
      }

      haibu.emit('drone:stderr', 'error', data.toString(), meta);
    });

    drone.on('error', function (data) {
      haibu.emit('drone:err', 'error', data.toString(), meta);
    });


    drone.once('start', function (monitor, file, data) {
      result = {
        monitor: monitor,
        process: monitor.child,
        drone: data
      };

      result.drone.port = port;
      result.drone.host = self.host;
    });

    drone.on('exit', function () {
      errState = true;
    });

    //
    // Wait briefly to see if the application exits immediately.
    //
    setTimeout(function () {
      var error;
      if (errState) {
        result.monitor.stop();
        error = new Error('Application closed too quickly on first attempt');
        if(errMsg) error.message = errMsg;
        return callback(error);
      }

      callback(null, result);
    }, 200);

    drone.start();
  });
};
