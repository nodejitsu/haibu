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
    path = require('path'),
    fs = require('fs'),
    eyes = require('eyes'),
    assert = require('assert'),
    data = require('fixtures/apps'),
    haibu = require('haibu'),
    exec = require('child_process').exec,
    helpers = require('../helpers'),
     Drone = haibu.drone.Drone;
var app = data.apps[0], store;

//
// Add a user property to the app
//
app.user = 'marak';

vows.describe('haibu/drone/process-store').addBatch(
  helpers.requireInit(function () {
    store = new haibu.ProcessStore();
  })
).addBatch({
  "An instance of haibu.ProcessStore": {
    "the save() method": {
      topic: function () {
        var that = this;
        store.save(app.name, app, function (err, filepath) {
          fs.stat(filepath, that.callback);
        });
      },
      "should save the file correctly": function (err, stats) {
        assert.isNull(err);
        assert.isNotNull(stats);
        assert.isTrue(stats.isFile());
      }
    }
  }
}).addBatch({
  "Testing out the purge method!": {
    "the purge() method": {
      topic: function () {
        var that = this;
        var drone = this.drone = new Drone({
          minUptime: 100,
          host: '127.0.0.1',
          maxRestart: 0
        });

        drone.start(app, function (err1, result1) {
          drone.start(app, function (err2, result2) {
            drone.start(app, function (err3, result3) {
              exec('ps -A | grep node', function (err, stdout, stderr) {
                  store.purge(function(){
                  exec('ps -A | grep node', function (err, stdout, stderr) {
                    store.list(function(res){that.callback(null,res)});
                  });
                });
              });
            });
          });
        });
      },
      "should have killed all carapace instances": function (err,res) {
        assert.isNull(res);
      }
    }
  }
}).export(module);
