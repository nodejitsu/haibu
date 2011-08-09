/*
 * config-test.js: Tests for the config module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var vows = require('vows'),
    helpers = require('../helpers'),
    assert = require('assert'),
    eyes = require('eyes'),
    haibu = require('../../lib/haibu');

vows.describe('haibu/config').addBatch({
  "When using the haibu config module": {
    "it should have the correct methods set": function () {
      assert.isFunction(haibu.config.seed);
      assert.isFunction(haibu.config.load);
      assert.isFunction(haibu.config.get);
      assert.isFunction(haibu.config.set);
      assert.isFunction(haibu.config.clear);
      assert.isFunction(haibu.config.reset);
      assert.isFunction(haibu.config.save);
      assert.isFunction(haibu.config.use);
    },
    "the seed() method": {
      topic: function () {
        haibu.config.seed(this.callback.bind(null, null));
      },
      "should respond without an error": function (ign, err) {
        assert.isTrue(typeof err === 'undefined');
      }
    }
  }
}).addBatch({
  "When using the haibu config module": {
    "the load() method": {
      topic: function () {
        haibu.config.load(this.callback.bind(null, null));
      },
      "should respond without an error": function (ign, err) {
        assert.isTrue(typeof err === 'undefined');
      }
    }
  }
}).addBatch({
  "When using the haibu config module": {
    "it should have the correct default config": function () {
      var include = {
        directories: ['apps', 'packages', 'tmp'],
      };

      Object.keys(include).forEach(function (key) {
        var setting = haibu.config.get(key);
        include[key].forEach(function (set) {
          assert.isTrue(typeof setting[set] !== 'undefined');
        });
      })
    }
  }
}).export(module);
