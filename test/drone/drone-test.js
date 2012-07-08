/*
 * drone-test.js: Tests for the `Drone` resource.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    exec = require('child_process').exec,
    fs = require('fs'),
    path = require('path'),
    eyes = require('eyes'),
    vows = require('vows'),
    data = require('../fixtures/apps'),
    helpers = require('../helpers'),
    haibu = require('../../lib/haibu'),
    Drone = haibu.drone.Drone;

var ipAddress = '127.0.0.1',
    app = data.apps[0];

//
// Add a user property to the app
//
app.user = 'marak';

vows.describe('haibu/drone/drone').addBatch(helpers.requireInit()).addBatch({
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
          assert.include(this.drone.apps[app.name].drones, result.uid);
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
          var callback = this.callback;
          var drone = this.drone = new Drone({
            minUptime: 0,
            host: ipAddress
          });

          drone.start(create, function (err, result) {
            drone.start(create, function (err, result) {
              drone.start(create, function (err, result) {
                drone.stop(create.name, callback);
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
        "when passed a callback": {
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
  }
}).addBatch({
  "An instance of haibu.drone.Drone": {
    "when passed a valid app json": {
      topic: app,
      "the restart() method when restarting a single drone": {
        "with an event listener": {
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

              that.originalPid = result.pid;
              haibu.once(['drone', 'stop'], function (_, result) {
                that.stopPid = result.process.pid;
              });
              
              haibu.once(['drone', 'start'], function () {
                that.callback.apply(that, arguments);                
              })
              
              drone.restart(create.name, function () {});
            });
          },
          "should emit the `drone:stop` event": function (_, result) {
            assert.equal(this.originalPid, this.stopPid);
            assert.notEqual(this.originalPid, result.process.pid);
            this.drone.stop(app.name, function () { 
              //
              // TEST CLEAN UP 
              //
            });
          }
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
      "the start() method": {
        topic: function () {
           var that = this,
               sourceDir = path.join(__dirname, '..', 'fixtures', 'repositories', 'delayed-fail'),
               pkgJson = fs.readFileSync(path.join(sourceDir, 'package.json')),
               delayFail = JSON.parse(pkgJson),
               drone;
            
           drone = this.drone = new Drone({
             minUptime: 2000,
             host: ipAddress,
             maxRestart: 3
           });

          delayFail.user = 'charlie';
          delayFail.repository.directory = sourceDir;
          drone.start(delayFail, this.callback);
        },
        "after the user has made the application crash": {
          topic: function () {
            var uid = Object.keys(this.drone.apps['delayed-fail'].drones)[0],
                pid = this.drone.apps['delayed-fail'].drones[uid].data.pid;
            
            setTimeout(this.callback.bind(this, null, uid, pid, this.drone), 3000);
          },
          "should have an updated pid for the drone": function (_, uid, pid, updated) {
            assert.isString(uid);
            assert.isNumber(pid);
            assert.isObject(updated);            
            assert.notEqual(pid, updated.apps['delayed-fail'].drones[uid].data.pid);
          },
          "the list() method should return an updated pid": function (_, uid, pid, drone) {
            var updatedPids = drone.apps['delayed-fail'].drones,
                listed = drone.list()['delayed-fail'].drones[0];
            
            assert.equal(listed.pid, updatedPids[listed.uid].data.pid);
          }
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
}).addBatch({
  "An instance of haibu.drone.Drone": {
    "the cleanAll() method": {
      topic: function (clean) {
        var drone = new Drone({
          minUptime: 0,
          host: ipAddress,
          maxRestart: 1
        });

        drone.cleanAll(this.callback);
      },
      "should remove the dependencies and source files": function (err) {
        assert.isTrue(!err);
        var files = fs.readdirSync(haibu.config.get('directories:apps'));
        assert.lengthOf(files, 0);
      }
    }
  }
}).export(module);

