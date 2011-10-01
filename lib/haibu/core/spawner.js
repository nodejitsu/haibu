/*
 * spawner.js: Spawner object responsible for starting carapace processes.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */
 
var fs = require('fs'),
    path = require('path'),
    forever = require('forever'),
    haibu = require('../../haibu');

var Spawner = exports.Spawner = function Spawner(options) {
  options = options || {};

  this.maxRestart = options.maxRestart;
  this.options = options
  this.silent     = options.silent     || false;
  this.host       = options.host       || '127.0.0.1';
  this.packageDir = options.packageDir || haibu.config.get('directories:packages');
  this.minUptime  = typeof options.minUptime !== 'undefined' ? options.minUptime : 2000;
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
      repo;

  try { repo = app instanceof haibu.repository.Repository ? app : haibu.repository.create(app) } 
  catch (ex) { return callback(ex) }
  
  if (repo instanceof Error) {
    return callback(repo);
  }
   
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

//
// ### function spawn (app, callback)
// #### @repo {Repository} App code repository to spawn from on this server.
// #### @callback {function} Continuation passed to respond to.
// spawns the appropriate carapace for an Application repository and bootstraps with the events listed
//
Spawner.prototype.spawn = function spawn (repo, callback) {
  if (!(repo instanceof haibu.repository.Repository)) {
    return callback(new Error('Error spawning drone: no repository defined'));
  }
  
  var self = this,
      app  = repo.app,
      meta = { app: app.name, user: app.user },
      script = repo.startScript,
      result,
      responded = false,
      stderr = [],
      foreverOptions,
      error,
      drone;

  haibu.emit('spawn:setup', 'info', meta);
  if(this.options['hook-port']) {
    options = ['--hook-port', this.options['hook-port']]
  }
  else {
    options = []
  }
  
  foreverOptions = {
    silent:    true,
    cwd:       repo.homeDir,
    hideEnv:   haibu.config.get('hideEnv'),
    env:       app.env,
    minUptime: this.minUptime,
    command:   path.join(require.resolve('haibu-carapace'), '..', '..', 'bin', 'carapace'),
    options:   options
  };

  //
  // Concatenate the `argv` of any plugins onto the options
  // to be passed to the carapace script. 
  //
  Object.keys(haibu.activePlugins).forEach(function (plugin) {
    var spawn;
    
    if (haibu.activePlugins[plugin].argv) {
      haibu.emit('plugin:argv', 'info', { 
        app: app.name, 
        user: app.user,
        plugin: plugin
      });
      
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
      app: meta.app, 
      user: meta.user
    });


    drone = new forever.Monitor(script, foreverOptions);

    drone.on('error', function () {
      //
      // 'error' event needs to be caught, otherwise 
      // the haibu process will die
      //
    });

    //
    // Log data from `drone.stdout` to haibu
    //
    function onStdout (data) {
      haibu.emit('drone:stdout', 'info', data.toString(), meta);
    }
    
    //
    // Log data from `drone.stderr` to haibu
    //
    function onStderr (data) {
      data = data.toString()
      haibu.emit('drone:stderr', 'error', data, meta);
      
      if (!responded) {
        stderr = stderr.concat(data.split('\n').filter(function (line) { return line.length > 0 }));
      }
    }
    
    //
    // If the `forever.Monitor` instance emits an error then
    // pass this error back up to the callback.
    //
    // (remark) this may not work if haibu starts two apps at the same time
    //
    function onError (err) {
      if (!responded) {
        errState = true;
        responded = true;
        callback(err);

        //
        // Remove listeners to related events.
        //
        drone.removeListener('exit', onExit);
        haibu.running.hook.removeListener('*::carapace::port', onCarapacePort);
      }
    }
    
    //
    // When the carapace provides the port that the drone
    // has bound to then respond to the callback
    //
    // Remark: What about `"worker"` processes that never
    // start and HTTP server?
    //
    function onCarapacePort (info) {
      if (!responded) {
        responded = true;
        result.socket = {
          host: self.host,
          port: info.port
        };
        drone.minUptime = 0;

        callback(null, result);
        
        //
        // Remove listeners to related events
        //
        drone.removeListener('exit', onExit);
        drone.removeListener('error', onError);
      }
    }
    
    //
    // When the drone starts, update the result that 
    // we will respond with and continue to wait for 
    // `*::carapace::port` from `haibu-carapace`.
    //
    function onStart (monitor, data) {
      result = {
        monitor: monitor,
        process: monitor.child,
        drone: data
      };
    }
    
    //
    // If the drone exits prematurely then respond with an error 
    // containing the data we receieved from `stderr` 
    //
    function onExit () {
      if (!responded) {
        errState = true;
        responded = true;
        error = new Error('Error spawning drone');
        error.stderr = stderr.join('\n')
        callback(error);

        //
        // Remove listeners to related events.
        //
        drone.removeListener('error', onError);
        haibu.running.hook.removeListener('*::carapace::port', onCarapacePort);
      }
    }
    
    //
    // Listen to the appropriate events and start the drone process.
    //
    drone.on('stdout', onStdout);
    drone.on('stderr', onStderr);
    drone.once('exit', onExit);
    drone.once('error', onError);
    drone.once('start', onStart);
    haibu.running.hook.once('*::carapace::port', onCarapacePort);
    drone.start();
  });
};
