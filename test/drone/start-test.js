/*
 * start-test.js: Tests for starting a `Drone` resource.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

require.paths.unshift(require('path').join(__dirname, '..', '..', 'lib'));
require.paths.unshift(require('path').join(__dirname, '..'));

var sys = require('sys'),
    assert = require('assert'),
    vows = require('vows'),
    helpers = require('../helpers'),
    path = require('path'),
    haibu = require('haibu');

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
      return false;
    },
    "the server should clean up": function () {
      haibu.running.server.close();
      haibu.running = null;
    }
  }
}).export(module);