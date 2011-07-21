var carapaceUtils = require('./utils');
var haibu = require('../../haibu');
var path = require('path')

function Spawner(options) {
  options = options || {};

  this.maxRestart = options.maxRestart;
  this.minUptime  = options.minUptime;
  this.silent     = options.silent     || false;
  this.appsDir    = options.appsDir    || haibu.config.get('directories:apps');
  this.packageDir = options.packageDir || haibu.config.get('directories:packages');
  this.host       = options.host       || '127.0.0.1';
}
exports.Spawner = Spawner;

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

Spawner.prototype.foreverOptions = function foreverOptions(repo, app, options) {
  options = options || {};
  return {
    minUptime: options.minUptime || this.minUptime,
    options: [options.startScript || repo.startScript],
    silent: true,
    cwd: options.homeDir || repo.homeDir,
    env: options.env || app.env
  };
}

//
// ### function spawn (app, callback)
// #### @app {App} Application to attempt to spawn on this server.
// #### @callback {function} Continuation passed to respond to.
// spawns the appropriate carapace for an Application and bootstraps with the events listed
//
Spawner.prototype.spawn = function spawn(repo, done) {
  var self = this;
  var app = repo instanceof haibu.repository.Repository ? repo.app : app;
  var meta = { app: app.name, user: app.user };
  
  var options;
  Object.keys(haibu.activePlugins).forEach(function (plugin) {
    if (!options && haibu.activePlugins[plugin].spawnOptions) {
      options = haibu.activePlugins[plugin].spawnOptions(repo, self.host);
    }
  });

  var foreverOptions;
  if (options && options.drone) {
    foreverOptions = options.drone;
  }
  
  foreverOptions = foreverOptions || {};
  foreverOptions = this.foreverOptions(repo, app, options || foreverOptions);
  
  foreverOptions.forever = typeof self.maxRestart === 'undefined';
  if (typeof self.maxRestart !== 'undefined') {
    foreverOptions.max = self.maxRestart;
  }
  
  carapaceUtils.spawn(foreverOptions, function(err, drone) {
    if(err) {
      done(err);
      return;
    }
    carapaceUtils.load(
      drone.carapace.client,
      app.carapace && app.carapace.plugins || [],
      ['node', app.scripts.start],
      function() {
        drone.carapace.client.use([carapace.plugins.chdir, carapace.plugins.chroot], function () {
        var newdir = path.join(haibu.config.get('directories:apps'),app.user,app.name, app.name);
        drone.carapace.client.emit('chdir:path', newdir, function() {
        //
        // App must live for 200 ms or it will be considered dead
        //
        var timer = Date.now() + 200, dead = true;
        
        function giveTimeout() {
          if(dead) {
            return;
          }
          if(timer < Date.now()) {
            killDrone();
          }
          else {
            timer = Date.now() + 200;
          }
        }
        
        function addDroneToHaibu() {
          if(!dead) {
            return;
          }
          dead = false;
          drone.emit('alive');
        }
        
        function deactivateDrone() {
          drone.emit('deactivated')
        }
        function activateDrone() {
          drone.emit('activated')
        }
        
        function killDrone() {
          if(dead) {
            return;
          }
          dead = true;
          drone.emit('dead');
        }
        if(drone.forever.monitor.childExists) {
          addDroneToHaibu();
        }
        else {
          drone.forever.monitor.on('start', addDroneToHaibu);
        }
        //drone.forever.monitor.on('restart', ?);
        drone.forever.monitor.on('stop', deactivateDrone);
        drone.forever.monitor.on('exit', killDrone);
        drone.forever.monitor.on('error', killDrone);
        
        drone.carapace.client.on('proxy:map', function(event, desired, actual) {
          //TODO FIXME TO NOT GRAB OFF HAIBU
          haibu.drone.Drone.prototype.map.call(haibu.running.drone,{
            desiredPort: desired,
            actualPort: actual,
            socket: drone.socket,
            app: app
          })
        });
        
        drone.carapace.connection.on('close',giveTimeout);
        drone.carapace.connection.on('dump',giveTimeout);
        drone.carapace.connection.on('refused',giveTimeout);
        function init() {
          drone.carapace.client.run([app.scripts.start].concat(app.argv||[]));
          
          setTimeout(function() {
            if(dead) {
              done(new Error('Application exited too quickly.'));
            }
            else {
              notimeout = true;
              done(false, drone);
            }
          },200);
        }
        if(drone.carapace.connected) {
          init();
        }
        else {
          drone.carapace.connection.on('ready', init)
        }
        })
      });
    });
      
  });
}
