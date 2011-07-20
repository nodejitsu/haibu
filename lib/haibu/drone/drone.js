/*
 * drone.js: Controls the application lifetime for nodejs applications on a single server.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var async = require('async'),
    haibu = require('haibu');

//
// ### function Drone (options)
// #### @options {Object} Options for this instance.
// Constructor function for the Drone resource.
//
var Drone = exports.Drone = function (options) {
  options = options || {};

  this.apps = {};
  this.appsDir = options.appsDir || haibu.config.get('directories:apps');
  this.host = options.host;
  this.drones = {};
  this.spawner = new haibu.Spawner(options);
};

//
// ### function start (app, callback)
// #### @app {App} Application to start in this instance.
// #### @callback {function} Continuation passed to respond to.
// Attempts to spawn the @app by passing it to the spawner.
//
Drone.prototype.start = function (app, callback) {
  var self = this;
  if(!this.apps[app.name]) {
    this.apps[app.name] = {
      ports: {
        //port: [{droneId:,realPort:}...]
      }
    }
  }
  this.spawner.trySpawn(app, function (err, result) {
    if (err) {
      return callback(err, false);
    }
    else if (typeof result === 'undefined') {
      return callback(new Error('Unknown error from Spawner.'));
    }

    self._add(app,
      result,
      function (err) {
        console.dir('done adding')
      //
      // If there is an error persisting the drone
      // to disk then just respond anyway since the
      // drone process started correctly.
      //

      var response = haibu.utils.clone(result);

      if (self.host) {
        response.host = self.host;
      }

      callback(null, response);
    });
  });
};

//descriptor:
// {desiredPort:,actualPort:,app:...}
Drone.prototype.map = function (descriptor, callback) {
  var ports = this.apps[descriptor.app.name].ports || (this.apps[descriptor.app.name].ports = {});
  var mappings = ports[descriptor.pid] || (ports[descriptor.pid] = []);
  mappings.push({
    desiredPort:descriptor.desiredPort,
    actualPort:descriptor.actualPort
  });
}

//
// ### function stop (name, callback)
// #### @name {string} Name of the application to stop (i.e. app.name).
// #### @callback {function} Continuation passed to respond to.
// Stops all drones with app.name === name managed by this instance
//
Drone.prototype.stop = function (name, callback) {
  if (typeof this.apps[name] === 'undefined') {
    return callback(new Error('Cannot stop application that is not running.'));
  }

  var self = this,
      app = this.apps[name],
      keys = Object.keys(app.drones),
      results = [];

  function removeAndSave (key, next) {
    app.drones[key].monitor.stop();
    results.push(app.drones[key].process);
    self._remove(app, app.drones[key], function () {
      next();
    });
  }

  async.forEach(keys, removeAndSave, function () {
    callback(null, results);
  });
};

//
// ### function restart (name, callback)
// #### @name {string} Name of the application to restart (i.e. app.name).
// Restarts all drones with app = name managed by this instance and
// responds with the list of processes of new processes.
//
Drone.prototype.restart = function (name, callback) {
  if (typeof this.apps[name] === 'undefined') {
    return callback(new Error('Cannot restart application that is not running.'));
  }

  var self = this,
      app = this.apps[name],
      keys = Object.keys(app.drones),
      processes = [];

  function restartAndSave (key, next) {
    var existing = app.drones[key].process.pid;

    app.drones[key].monitor.once('save', function (file, data) {
      self._update(app, existing, data.pid, function () {
        processes.push(app.drones[data.pid].process);
        next();
      });
    });

    app.drones[key].monitor.restart();
  }

  async.forEach(keys, restartAndSave, function () {
    callback(null, processes);
  });
};

//
// ### function clean (app)
// #### @app {App} Application to clean in this instance.
// #### @callback {function} Continuation passed to respond to.
// Stops the potentially running application then removes all dependencies
// and source files associated with the application.
//
Drone.prototype.clean = function (app, callback) {
  if (!app.user || !app.name) {
    return callback(new Error('Both `user` and `name` are required.'));
  }

  var self = this;
  this.stop(app.name, function (err, result) {
    //
    // Ignore errors and continue cleaning
    //
    haibu.utils.rmApp(self.appsDir, app, callback);
  });
};


//
// ### function update (name, callback)
// #### @name {string} Name of the application to update (i.e. app.name).
// Stops an application, Cleans all source and deps, Starts the pplication
//
Drone.prototype.update = function (app, callback) {

  if (typeof this.apps[app.name] === 'undefined') {
    return callback(new Error('Cannot update application that is not running.'));
  }

  var self = this;
  self.clean(app, function(err){
    self.start(app, function(err, result){
      callback(err, result);
    });
  });

};

//
// ### function show (name)
// #### @name {string} Name of the application to show (i.e. app.name)
// Shows details for drone with `name` managed by this instance
//
Drone.prototype.show = function (name) {
  var self = this,
      app = this.apps[name],
      appData;

  appData = {
    app: this.apps[name].app,
    drones: []
  };

  if (app.drones) {
    Object.keys(app.drones).forEach(function (pid) {
      appData.drones.push(app.drones[pid].process);
    });
  }

  return appData;
}

//
// ### function list ()
// Lists details about all drones managed by this instance
//
Drone.prototype.list = function () {
  var self = this,
      allApps = {};

  Object.keys(this.apps).forEach(function (name) {
    allApps[name] = self.show(name);
  });

  return allApps;
};

//
// ### function _add (app, drone)
// #### @app {App} Application for which to attach @drone to
// #### @drone {Object} Drone to attach to @app
// Attaches the specified drone to the application in
// this instance.
//
Drone.prototype._add = function (app, drone, callback) {
  var self = this;

  function saveDrone (err) {
    if(err) {
      callback(err);
    }
    else {
      self.apps[app.name].drones[drone.socket] = drone;
      callback();
    }
  }

  var appDescriptor = this.apps[app.name];
  if (!appDescriptor) {
     appDescriptor = this.apps[app.name] = {};
  }
  if (!appDescriptor.app) {
    appDescriptor.app = app;
    appDescriptor.drones = {};

    if(app.domain) {
      app.domain = app.domain.toLowerCase();
    }
    else {
      app.domains = (app.domains || []).map(function(domain){
        return (''+domain).toLowerCase();
      });
    }
    app.ports = [];
  }
  else {
    var updated = false;
    var domains = app.domain || app.domains;
    var existingApp = appDescriptor;
    var existingDomains = existingApp.domain || existingApp.domains;
    if (typeof existingDomains === 'object') {
      if (typeof domains === 'object') {
        domains = domains.map(function(domain){
          return (''+domain).toLowerCase();
        });
        for(var i = 0; i < domains.length; i++) {
          var domain = domains[i];
          if(existingDomains.indexOf(domain) === -1) {
            existingDomains.push(domain);
            updated = true;
          }
        }
      }
      else if (existingDomains.indexOf(domains) === -1) {
        existingDomains.push(domains);
        updated = true;
      }
    }
    else {
      if (typeof domains === 'object') {
        domains = domains.map(function(domain){
          return (''+domain).toLowerCase();
        });
        if (domains.indexOf(existingDomains) === -1) {
          domains.push(existingDomains);
          updated = true;
        }
        app.domain = domains;
      }
      else if (domains != existingDomains) {
        app.domain = [existingDomains, domains];
        updated = true;
      }
    }
  }
  if(typeof app.domain == 'object') {
    if(app.domain.length > 1) {
      app.domains = app.domain;
      delete app.domain;
    }
    else {
      app.domain = app.domain[0];
    }
  }

  if (updated) {
    this.apps[app.name].app.domain = app.domain;
    this.apps[app.name].app.domains = app.domains;
    this.processes.save(app.name, app, saveDrone);
  }
  else {
    saveDrone();
  }
};

//
// ### function _remove (a, drone)
// #### @a {Object} Wrapped {app, drone} tuple set in _add
// #### @drone {Object} Drone metadata to remove from the specified application
// Removes the specified drone object from the bookkeeping of this instance.
//
Drone.prototype._remove = function (a, drone, callback) {
  var self = this,
      app = this.apps[a.app.name];

  delete app.drones[drone.process.pid];

  this.processes.remove(a.app.name, drone.process, function () {
    //
    // If there are no more drones for this app
    // delete the entire app
    //
    if (Object.keys(app.drones).length === 0) {
      delete self.apps[a.app.name];
      return self.processes.remove(a.app.name, app, callback);
    }

    callback();
  });
};

Drone.prototype._update = function (a, existing, update, callback) {
  var self = this,
      app = this.apps[a.app.name],
      drone = app.drones[existing];

  this.processes.remove(a.app.name, drone.process, function () {
    delete app.drones[drone.process.pid];
    drone.process.pid = update;
    app.drones[update] = drone;

    self.processes.save(a.app.name, drone.process, callback);
  });
};
