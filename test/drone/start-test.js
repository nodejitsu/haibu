/*
 * start-test.js: Tests for starting a `Drone` resource.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    path = require('path'),
    vows = require('vows'),
    helpers = require('../helpers'),
    haibu = require('../../lib/haibu');

vows.describe('haibu/drone/start').addBatch(helpers.requireInit()).addBatch({
  "When using haibu": {
    "a call to haibu.drone.start()": {
      topic: function (create) {
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
      }
    }
  }
}).addBatch({
  "when the tests are over": {
    topic: function () {
      haibu.drone.stop(this.callback);
    },
    "the server should clean up": function () {
      assert.lengthOf(Object.keys(haibu.running), 0);
    }
  }
}).export(module);

