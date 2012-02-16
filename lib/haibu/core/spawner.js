/*
 * spawner.js: Spawner object responsible for starting carapace processes.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs'),
    path = require('path'),
    forever = require('forever'),
    semver = require('semver'),
    haibu = require('../../haibu');

haibu.getSpawnOptions = function getSpawnOptions (app) {
  var env = app.env, 
      command = 'node',
      nodeDir,
      version,
      engine = (app.engines || app.engine || {node: app.engine}).node,
      cwd,
      engineDir = haibu.config.get('directories:node-installs'),
      nodeVersions = engineDir && fs.readdirSync(engineDir),
      carapaceDir = haibu.config.get('directories:carapace-installs'),
      carapaceVersions = carapaceDir && fs.readdirSync(carapaceDir);
      
  var options = {};
  if (nodeVersions) {
    engine = (app.engines || app.engine || {node: app.engine}).node;
    if (typeof engine !== 'string') {
      engine = '0.4.x';
    }
    version = semver.maxSatisfying(nodeVersions, engine);
    if (!version) {
      var err = new Error('Error spawning drone: no matching engine found');
      err.blame = {
        type: 'user',
        message: 'Repository configuration'
      }
      throw err;
    }
    nodeDir = path.join(engineDir, version);
  }
  if (carapaceVersions) {
    if (typeof engine !== 'string') {
      engine = '0.4.x';
    }
    version = semver.maxSatisfying(carapaceVersions, engine);
    if (!version) {
      var err = new Error('Error spawning drone: no matching carapace found');
      err.blame = {
        type: 'user',
        message: 'Repository configuration'
      }
      throw err;
    }
    options.carapaceBin = path.join(carapaceDir, version, 'node_modules', 'haibu-carapace', 'bin', 'carapace');
  }
  else {
    options.carapaceBin = path.join(require.resolve('haibu-carapace'), '..', '..', 'bin', 'carapace');
  }

  if (version) {
    //
    // Add node (should be configured with --no-npm) and -g modules to path of repo
    //
    if (semver.lt(version, '0.6.5')) {
      options.forkShim = carapaceVersions ? path.join(options.carapaceBin, '..', '..', '..', 'node-fork', 'lib', 'fork.js') : true;
    }
    if (env) {
      env.NODE_VERSION = 'v'+version;
      env.NODE_PREFIX = nodeDir;
      env.NODE_PATH = path.join(nodeDir, 'lib', 'node_modules');
      var concatPATH = (process.env.PATH ? ':' + process.env.PATH : '');
      env.PATH = path.join(nodeDir, 'bin') + ':' + path.join(nodeDir, 'node_modules') + concatPATH;
      var concatCPATH = (process.env.CPATH ? ':' + process.env.CPATH : '');
      env.CPATH = path.join(nodeDir, 'include') + ':' + path.join(nodeDir, 'include', 'node') + concatCPATH;
      var concatLIBRARY_PATH = (process.env.LIBRARY_PATH ? ':' + process.env.LIBRARY_PATH : '');
      env.LIBRARY_PATH = path.join(nodeDir, 'lib') + ':' + path.join(nodeDir, 'lib', 'node') + concatLIBRARY_PATH;
    }
    
    options.cwd = nodeDir;
    command = path.join(nodeDir, 'bin', 'node');
  }

  options.env = env;
  options.command = command;
  
  return options;
}

var Spawner = exports.Spawner = function Spawner(options) {
  options = options || {};

  this.maxRestart = options.maxRestart;
  this.options    = options
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
    var err = new Error('Error spawning drone: no repository defined');
    err.blame = {
      type: 'user',
      message: 'Repository configuration'
    }
    return callback();
  }

  var self = this,
      app  = repo.app,
      meta = { app: app.name, user: app.user },
      script = repo.startScript,
      result,
      responded = false,
      stderr = [],
      stdout = [],
      options = [],
      foreverOptions,
      carapaceBin,
      error,
      drone;

  haibu.emit('spawn:setup', 'info', meta);
  
  try {
    var spawnOptions = haibu.getSpawnOptions(app);
  }
  catch (e) {
    return callback(e);
  }

  foreverOptions = {
    fork:      true,
    silent:    true,
    cwd:       repo.homeDir,
    hideEnv:   haibu.config.get('hideEnv'),
    env:       spawnOptions.env,
    forkShim:  spawnOptions.forkShim,
    minUptime: this.minUptime,
    command:   spawnOptions.command,
    options:   [spawnOptions.carapaceBin].concat(options)
  };
  //
  // Concatenate the `argv` of any plugins onto the options
  // to be passed to the carapace script.
  //
  Object.keys(haibu.plugins).forEach(function (plugin) {
    var spawn;

    if (haibu.plugins[plugin].argv) {
      haibu.emit('plugin:argv', 'info', {
        app: app.name,
        user: app.user,
        plugin: plugin
      });

      spawn = haibu.plugins[plugin].argv(repo);

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
      var err = new Error('package.json error: ' + 'can\'t find starting script: ' + repo.app.scripts.start);
      err.blame = {
        type: 'user',
        message: 'Package.json start script declared but not found'
      }
      return callback(err);
    }

    haibu.emit('spawn:start', 'info', {
      options: foreverOptions.options.join(' '),
      app: meta.app,
      user: meta.user
    });

    foreverOptions.options.push(script);
    carapaceBin = foreverOptions.options.shift();
    drone = new forever.Monitor(carapaceBin, foreverOptions);
    drone.on('error', function () {
      //
      // 'error' event needs to be caught, otherwise
      // the haibu process will die
      //
    });
    haibu.emit('spawn:drone', 'info', drone);

    //
    // Log data from `drone.stdout` to haibu
    //
    function onStdout (data) {
      data = data.toString()
      haibu.emit('drone:stdout', 'info', data, meta);

      if (!responded) {
        stdout = stdout.concat(data.split('\n').filter(function (line) { return line.length > 0 }));
      }
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
        drone.removeListener('message', onCarapacePort);
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
      if (!responded && info && info.event === 'port') {
        responded = true;
        result.socket = {
          host: self.host,
          port: info.data.port
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
        data: data
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
        error.blame = {
          type: 'user',
          message: 'Script prematurely exited'
        }
        error.stdout = stdout.join('\n');
        error.stderr = stderr.join('\n');
        callback(error);

        //
        // Remove listeners to related events.
        //
        drone.removeListener('error', onError);
        drone.removeListener('message', onCarapacePort);
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
    drone.on('message', onCarapacePort);
    drone.start();
  });
};

