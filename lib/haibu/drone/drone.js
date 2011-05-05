/*
 * drone.js: Controls the application lifetime for nodejs applications on a single server.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    colors = require('colors'),
    async = require('async'),
    haibu = require('haibu');

//
// ### function Drone (options)
// #### @options {Object} Options for this instance.
// Constructor function for the Drone resource.
//
var Drone = exports.Drone = function (options) {
  this.apps = {};
  this.appsDir = options.appsDir || haibu.config.get('directories:apps');
  this.ipAddress = options.ipAddress;
  this.processes = new haibu.ProcessStore(options);
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
  this.spawner.trySpawn(app, function (err, result) {
    if (err) {
      return callback(err, false);
    }
    else if (typeof result === 'undefined') {
      return callback(new Error('Unknown error from Spawner.'));
    }

    var response = {
      drone: result.drone
    };
    
    self._add(app, {
      process: result.drone,
      monitor: result.monitor
    }, function (err) {
      //
      // If there is an error persisting the drone
      // to disk then just respond anyway since the
      // drone process started correctly.
      //
      
      callback(null, response);
    });
  });
};
  
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
// #### @app {App} Application to start in this instance.
// #### @callback {function} Continuation passed to respond to.
// Stops the potentially running application then removes all dependencies
// and source files associated with the application.
//
Drone.prototype.clean = function (app, callback) {
  var self = this, 
      repo = haibu.repository.create(app);
      
  this.stop(app.name, function (err, result) {
    // Ignore errors and continue cleaning
    repo.clean(function (err) {
      if (err) {
        return callback(err);
      }
      
      callback(null, repo);
    });
  });
};

//
// ### function show (name) 
// #### @name {string} Name of the application to show (i.e. app.name)
// Shows details for drone with `name` managed by this instance
//
Drone.prototype.show = function (name) {
  return this.apps[name];
};
  
//
// ### function list () 
// Lists details about all drones managed by this instance
//
Drone.prototype.list = function () {
  return this.apps;
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
    self.apps[app.name].drones[drone.process.pid] = drone;
    self.processes.save(app.name, drone.process, callback);
  }
  
  if (typeof this.apps[app.name] === 'undefined') {    
    this.apps[app.name] = {
      app: app,
      drones: {}
    };
    
    return this.processes.save(app.name, app, saveDrone);
  }
  
  saveDrone();
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