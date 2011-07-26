/*
 * drone-test.js: Tests for the `Drone` resource.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

require.paths.unshift(require('path').join(__dirname, '..', '..', 'lib'));
require.paths.unshift(require('path').join(__dirname, '..'));

var sys = require('sys'),
    vows = require('vows'),
    helpers = require('../helpers'),
    path = require('path'),
    fs = require('fs'),
    eyes = require('eyes'),
    assert = require('assert'),
    exec = require('child_process').exec,
    data = require('fixtures/apps'),
    haibu = require('haibu'),
    Drone = haibu.drone.Drone;

var ipAddress = '127.0.0.1',
    app = data.apps[0];

//
// Add a user property to the app
//
app.user = 'marak';

vows.describe('haibu/drone/drone').addBatch(helpers.requireHook()).addBatch({
  "An instance of haibu.drone.Drone": {
    "when passed a valid app json": {
      topic: app,
      "the start() method": {
        topic: function (create) {
          var drone = this.drone = new Drone({
            minUptime: 0,
            host: ipAddress,
            maxRestart: 1
          });
          
          drone.start(create, this.callback);
        },
        "should return with a valid drone": function (err, result) {
          assert.isNull(err);
          assert.isNotNull(result);
          assert.isObject(result);
          assert.include(this.drone.apps, app.name);
          assert.include(this.drone.apps[app.name].drones, result.pid);
        },
        "the stop() method when stopping a single drone": {
          topic: function (_, create) {
            this.drone.stop(create.name, this.callback);
          },
          "should respond with no error": function (err, result) {
            assert.isNull(err);
            assert.isUndefined(this.drone.apps[app.name]);
          }
        }
      }
    }
  }
}).addBatch({
  "An instance of haibu.drone.Drone": {
    "when passed a valid package.json": {
      topic: app,
      "the stop() method when stopping multiple drones": {
        topic: function (create) {
          var that = this;
          var drone = this.drone = new Drone({
            minUptime: 0,
            host: ipAddress
          });

          drone.start(create, function (err, result) {
            drone.start(create, function (err, result) {
              drone.start(create, function (err, result) {
                drone.stop(create.name, that.callback);
              });
            });
          });
        },
        "should respond with no error": function (err, result) {
          assert.isNull(err);
          assert.isUndefined(this.drone.apps[app.name]);
        }
      }
    }
  }
}).addBatch({
  "An instance of haibu.drone.Drone": {
    "when passed a valid app json": {
      topic: app,
      "the restart() method when restarting a single drone": {
        topic: function (create) {
          var that = this;
          var drone = this.drone = new Drone({
            minUptime: 0,
            host: ipAddress,
            maxRestart: 2
          });

          drone.start(create, function (err, result) {
            if (err) {
              return that.callback(err);
            }
            
            drone.restart(create.name, that.callback);
          });
        },
        "should return true": function (err, drones) {
          assert.isNull(err);
          assert.isArray(drones);
          assert.equal(drones.length, 1);
          this.drone.stop(app.name, function () { 
            //
            // TEST CLEAN UP 
            //
          });
        }
      }
    }
  }
}).addBatch({
  "An instance of haibu.drone.Drone": {
    "when passed a valid package.json": {
      topic: app,
      "the restart() method when restarting multiple drones": {
        topic: function (create) {
          var that = this;
          var drone = this.drone = new Drone({
            minUptime: 0,
            host: ipAddress,
            maxRestart: 2
          });

          
          drone.start(create, function (err, result) {
            drone.start(create, function (err, result) {
              drone.start(create, function (err, result) {
                drone.restart(create.name, that.callback);
              });
            });
          });
        },
        "should return the list of drones restarted": function (err, drones) {
          assert.isNull(err);
          assert.isArray(drones);
          assert.equal(drones.length, 3);
          this.drone.stop(app.name, function () { 
            //
            // TEST CLEAN UP 
            //
          });
        }
      }
    }
  }
}).addBatch({
  "An instance of haibu.drone.Drone": {
    "when passed a valid app json": {
      topic: app,
      "the clean() method": {
        topic: function (clean) {
          var that = this, drone = new Drone({
            minUptime: 0,
            host: ipAddress,
            maxRestart: 1
          });

          drone.clean(clean, function (err, repo) {
            if (err) {
              return that.callback(err);
            }

            var appDir = path.join(haibu.config.get('directories:apps'), clean.user, clean.name);
            fs.readdir(appDir, function (err, files) {
              if (err) {
                return that.callback(err);
              }

              that.callback(null, false);
            });
          });
        },
        "should remove the dependencies and source files": function (err, files) {
          assert.isNotNull(err);
          assert.isTrue(err.message.indexOf('ENOENT') !== -1);
          assert.isTrue(files !== false);
        }
      }
    }
  }
}).export(module);
