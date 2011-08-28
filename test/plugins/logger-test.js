/*
 * logger-test.js: Tests for the haibu `logger` plugin.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    vows = require('vows'),
    haibu = require('../../lib/haibu'),
    helpers = require('../helpers');

vows.describe('haibu/plugins/logger').addBatch(helpers.requireInit()).addBatch({
  "When using the logger plugin": {
    "it should have the correct methods defined": function () {
      assert.isFunction(haibu.plugins.logger.init);
      assert.isFunction(haibu.plugins.logger.initInput);
    }
  }
}).export(module);