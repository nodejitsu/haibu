/*
 * spawner.js: Spawner object responsible for starting carapace processes.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */
 
var fs = require('fs'),
    path = require('path'),
    carapace = require('haibu-carapace'),
    forever = require('forever'),
    haibu = require('../../haibu');

var Spawner = exports.Spawner = function Spawner(options) {
  options = options || {};

  this.maxRestart = options.maxRestart;
  this.minUptime  = options.minUptime;
  this.silent     = options.silent     || false;
  this.appsDir    = options.appsDir    || haibu.config.get('directories:apps');
  this.packageDir = options.packageDir || haibu.config.get('directories:packages');
  this.host       = options.host       || '127.0.0.1';
};

//
// ### function trySpawn (app, callback)
// #### @app {App} Application to attempt to spawn on this server.
// #### @callback {function} Continuation passed to respond to.
// Attempts to spawn the application with the package.json manifest
// represented by @app, then responds to @callback.
//
Spawner.prototype.trySpawn = function (app, callback) {
  var self = this, 
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

Spawner.prototype.foreverOptions = function foreverOptions (repo, app, options) {
  options = options || {};
  return 
}

//
// ### function spawn (app, callback)
// #### @app {App} Application to attempt to spawn on this server.
// #### @callback {function} Continuation passed to respond to.
// spawns the appropriate carapace for an Application and bootstraps with the events listed
//
Spawner.prototype.spawn = function spawn (repo, callback) {
  var self = this,
      app  = repo instanceof haibu.repository.Repository ? repo.app : app,
      meta = { app: app.name, user: app.user },
      script = repo.startScript,
      foreverOptions,
      drone;

  haibu.emit('spawn:setup', 'info', { app: app.id, username: app.user });
  
  foreverOptions = {
    silent:    true,
    cwd:       repo.homeDir,
    env:       app.env,
    minUptime: this.minUptime,
    command:   carapace.bin,
    options:   []
  };

  //
  // Concatenate the `argv` of any plugins onto the options
  // to be passed to the carapace script. 
  //
  Object.keys(haibu.activePlugins).forEach(function (plugin) {
    var spawn;
    if (haibu.activePlugins[plugin].argv) {
      spawn = haibu.activePlugins[plugin].argv(repo);
      
      if (spawn.script) {
        script = spawn.script
      }
      
      if (spawn.argv) {
        foreverOptions.options = foreverOptions.options.concat(spawn.argv); 
      }
    }
  });

  foreverOptions.forever = typeof self.maxRestart === 'undefined';
  if (typeof self.maxRestart !== 'undefined') {
    foreverOptions.max = self.maxRestart;
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
    
    haibu.emit('spawn:start', 'info', { 
      options: foreverOptions.options.join(' '), 
      app: meta.app, user: meta.user
    });

    drone = new forever.Monitor(script, foreverOptions);

    //
    // TODO (indexzero): This output should be in its own Loggly input (i.e. log.user instead of log.drone)
    //
    drone.on('stdout', function (data) {
      haibu.emit('drone:stdout', 'info', data.toString(), meta);
    });

    drone.on('stderr', function (data) {
      haibu.emit('drone:stderr', 'error', data.toString(), meta);
    });

    drone.on('error', function (data) {
      //
      // Remark: Now that it has exited what should we do?
      //
      haibu.emit('drone:err', 'error', data.toString(), meta);
    });

    haibu.running.hook.once('*::port', function (source, ev, port) {
      result.socket = {
        host: self.host,
        port: port
      };
      
      callback(null, result);
    });

    drone.once('start', function (monitor, data) {
      result = {
        monitor: monitor,
        process: monitor.child,
        drone: data
      };
    });

    drone.on('exit', function () {
      //
      // Remark: Now that it has exited what should we do?
      // This would only happen in the event that it is a `spinRestart`.
      // Should haibu waste server resources trying to restart a server that 
      // crashes every 10ms?
      //
      errState = true;
    });

    drone.start();
  });
};
