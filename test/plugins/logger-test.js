/*
 * model.js: Tests for the 'model' module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

require.paths.unshift(require('path').join(__dirname, '..', '..', 'lib'));

var vows = require('vows'),
    path = require('path'),
    eyes = require('eyes'),
    assert = require('assert'),
    exec = require('child_process').exec,
    winston = require('winston'),
    haibu = require('haibu'),
    helpers = require('./../helpers');

vows.describe('haibu/plugins/logger').addBatch(helpers.requireInit()).addBatch({
  "When using the log module": {
    "it should have the correct methods defined": function () {
      assert.isFunction(haibu.plugins.logger.init);
    }
  }
}).export(module);