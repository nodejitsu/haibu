/*
 * drone.js: Controls the application lifetime for nodejs applications on a single server.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var async = require('async'),
    path = require('path'),
    fs = require('fs'),
    haibu = require('../../haibu');

//
// ### function Drone (options)
// #### @options {Object} Options for this instance.
// Constructor function for the Drone resource.
//
var Drone = exports.Drone = function (options) {
  options = options || {};

  this.apps    = {};
  this.appsDir = options.appsDir || haibu.config.get('directories:apps');
  this.host    = options.host || 'localhost';
  this.drones  = {};
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

    self._add(app, result, function (err) {
      //
      // If there is an error persisting the drone
      // to disk then just respond anyway since the
      // drone process started correctly.
      //
      callback(null, self._formatRecord(result));
    });
  });
};

//
// ### function stop (name, callback)
// #### @name {string} Name of the application to stop (i.e. app.name).
// #### @cleanup {bool} (optional) Remove all autostart files (default=true).
// #### @callback {function} Continuation passed to respond to.
// Stops all drones with app.name === name managed by this instance
//
Drone.prototype.stop = function (name, cleanup, callback) {
  if (typeof cleanup !== 'boolean') {
    callback = cleanup;
    cleanup = true;
  }

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
    self._remove(app, app.drones[key], cleanup, function () {
      next();
    });
  }

  async.forEach(keys, removeAndSave, function () {
    callback(null, results);
  });
};

//
// ### function destroy (cleanup, callback)
// #### @cleanup {bool} Remove all autostart files.
// #### @callback {function} Continuation pased to respond to.
// Stops all drones managed by this instance
//
Drone.prototype.destroy = function (cleanup, callback) {
  var self = this;
  async.forEach(Object.keys(this.apps), function (name, callback) {
    self.stop(name, cleanup, callback);
  }, callback);
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
      record = this.apps[name],
      keys = Object.keys(record.drones),
      processes = [];

  function restartAndUpdate (key, next) {
    var existing = record.drones[key].process.pid;

    record.drones[key].monitor.once('restart', function (_, data) {
      self._update(record, existing, data, function () {
        processes.push(self._formatRecord(record.drones[data.pid]));
        next();
      });
    });

    record.drones[key].monitor.restart();
  }

  async.forEach(keys, restartAndUpdate, function () {
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
// ### function cleanAll ()
// #### @callback {function} Continuation passed to respond to.
// Stops all potentially running applications and removes all source code
// and/or dependencies associated with them from this instance.
//
Drone.prototype.cleanAll = function (callback) {
  var self = this;
  
  function cleanApp (name, next) {
    self.clean(self.apps[name].app, next);
  }
  
  async.forEach(Object.keys(this.apps), cleanApp, function (err) {
    return err ? callback(err) : haibu.utils.rmApps(self.appsDir, callback);
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
  this.clean(app, function (err) {
    self.start(app, function (err, result) {
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
      appData.drones.push(self._formatRecord(app.drones[pid]));
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
// ### function _autostartFile (app)
// #### @app {Object} App to create the autostart file for.
// Returns filename for haibu's persistance (autostart) feature
//
Drone.prototype._autostartFile = function (app) {
  var appname = haibu.utils.sanitizeAppname(app.name);
  return path.join(haibu.config.get('directories:autostart'), appname + '.json');
};

//
// ### function _autostartUpdate (action, app, drones, callback)
// #### @action {'start'|'stop'} Action to perform on the autostart file
// #### @app {Object} Application to update for autostart
// #### @drones {Object} Existing drones for the specified `app`.
// #### @callback {function} Continuation to respond to when complete.
// Performs the `action` for the autostart file on the specified `app`
// with the current `drones`.
//
Drone.prototype._autostartUpdate = function (action, app, drones, callback) {
  var _drones = app.drones,
      autostartFile = this._autostartFile(app),
      dronesCount = Object.keys(drones).length,
      appJson;

  app.drones = dronesCount;
  appJson = JSON.stringify(app);
  app.drones = _drones;

  // If app has no drones - remove autostart file
  if (action === 'remove' && dronesCount == 0) {
    return fs.unlink(autostartFile, callback);
  }
  
  function writeFile() {
    fs.writeFile(autostartFile, appJson, callback);
  }

  //
  // Attempt to read any  old `autostartFile`; if it
  // doesn't exist, overwrite it. Otherwise, update it
  // based on the `action` supplied.
  //
  fs.readFile(autostartFile, function (err, contents) {
    if (err) {
      return writeFile();
    }

    try {
      contents = JSON.parse(contents.toString());
    } 
    catch (ex) {
      return writeFile();
    }

    //
    // Update file only if:
    // action == 'add': drones count less than in new app
    // action == 'remove': drones count greater than in new app
    //
    if (action === 'add' && contents.drones < app.drones ||
        action === 'remove' && contents.drones > app.drones) {
      return writeFile();
    } 
    
    callback();
  });
};

//
// ### function _add (app, drone)
// #### @app {App} Application for which to attach @drone to
// #### @drone {Object} Drone to attach to @app
// Attaches the specified drone to the application in
// this instance.
//
Drone.prototype._add = function (app, drone, callback) {
  //
  // Create a record for this app if it doesn't exist
  //
  this.apps[app.name] = this.apps[app.name] || {};
  
  var self = this,
      record = this.apps[app.name];

  if (!record.app) {
    //
    // If we have not yet created a record for this app
    // then sanitize the data in the app and update the record.
    //
    ['domain', 'subdomain'].forEach(function (prop) {
      if (app[prop]) {
        app[prop] = app[prop].toLowerCase();
      }
    });
    
    ['domains', 'subdomains'].forEach(function (prop) {
      if (app[prop]) {
        app[prop] = app[prop].map(function (value) {
          return value.toLowerCase();
        });
      }
    });
    
    record.app = app;
    record.drones = {};
  }

  record.drones[drone.process.pid] = drone;
  this._autostartUpdate('add', app, record.drones, callback);
};

//
// ### function _remove (a, drone)
// #### @record {Object} Wrapped {app, drone} tuple set in _add
// #### @drone {Object} Drone metadata to remove from the specified application
// #### @cleanup {bool} (optional) Remove all autostart files (default = true).
// Removes the specified drone object from the bookkeeping of this instance.
//
Drone.prototype._remove = function (record, drone, cleanup, callback) {
  var self = this;

  if (typeof cleanup !== 'boolean') {
    callback = cleanup;
    cleanup = true;
  }

  delete record.drones[drone.process.pid];

  //
  // If there are no more drones for this app
  // delete the entire app
  //
  if (Object.keys(record.drones).length === 0) {
    delete self.apps[record.app.name];
  }

  if (cleanup) {
    this._autostartUpdate('remove', record.app, record.drones, callback);
  } 
  else {
    callback();
  }
};

//
// ### function _update (record, existing, update, callback)
// #### @record {Object} Wrapped {app, drone} tuple set in _add
// #### @existing {string} Existing pid for the drone to be updated.
// #### @updated {Object} New forever data for the drone
// Updates the pid of the `existing` drone process for the app specified
// by `records` with the `updated` pid.
//
Drone.prototype._update = function (record, existing, updated, callback) {
  var drone = record.drones[existing];
  
  delete record.drones[existing];
  drone.process = drone.monitor.child;
  drone.data = updated;
  record.drones[updated.pid] = drone;
  
  callback();
};

//
// ### function _formatRecord (record)
// #### @record {Object} Record to format.
// Formats the specified `record` based on the `record.socket`.
//
Drone.prototype._formatRecord = function (record) {
  var response = haibu.utils.clone(record.drone);
  
  if (record.socket && record.socket.port) {
    response.port = record.socket.port;
    response.host = record.socket.host;
  }

  response.host = response.host || this.host || 'localhost';
  return response;
};
