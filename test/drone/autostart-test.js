/*
 * autostart-test.js: Tests for autostarting drones.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    path = require('path'),
    sys = require('sys'),
    vows = require('vows'),
    data = require('../fixtures/apps'),
    helpers = require('../helpers').requireInit(),
    haibu = require('../../lib/haibu');

var app = data.apps[0];

//
// Add a user property to the app
//
app.user = 'marak';

vows.describe('haibu/drone/autostart').addBatch(helpers).addBatch({
  "When using haibu": {
    "a call to haibu.drone.start()": {
      topic: function () {
        haibu.drone.start({
          host: 'localhost',
          port: 9100
        }, this.callback);
      },
      "should namespace the server and drone": function (err, server) {
        assert.isNull(err);
        assert.isObject(haibu.running);
        assert.isObject(haibu.running.server);
        assert.isObject(haibu.running.drone);
      },
      "and running one drone": {
        topic: function (server) {
          server.drone.start(app, this.callback);
        },
        "should be successfull": function(err, drone) {
          assert.isNull(err);
        }
      }
    }
  }
}).addBatch({
  "Stopping server": {
    topic: function () {
      haibu.drone.stop(this.callback);
    },
    "should be successfull": function() {
    }
  }
}).addBatch({
  "When using haibu": {
    "a call to haibu.drone.start()": {
      topic: function () {
        haibu.drone.start({
          host: 'localhost',
          port: 9100
        }, this.callback);
      },
      "should namespace the server and drone": function (err, server) {
        assert.isNull(err);
        assert.isObject(haibu.running);
        assert.isObject(haibu.running.server);
        assert.isObject(haibu.running.drone);
      },
      "and a resulting server": {
        topic: function (server) {return server;},
        "should be running `test` app": function (server) {
          assert.isNotNull(server.drone.apps.test);
          assert.equal(Object.keys(server.drone.apps.test.drones).length, 1);
        }
      }
    }
  }
}).addBatch({
  "When the tests are over": {
    topic: function () {
      haibu.drone.stop(this.callback);
    },
    "the server should clean up": function () {}
  }
}).export(module);
