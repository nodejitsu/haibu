/*
 * model.js: Tests for the 'model' module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    exec = require('child_process').exec,
    path = require('path'),
    eyes = require('eyes'),
    winston = require('winston'),
    vows = require('vows'),
    haibu = require('../../lib/haibu'),
    helpers = require('../helpers');

vows.describe('haibu/plugins/logger').addBatch(helpers.requireInit()).addBatch({
  "When using the log module": {
    "it should have the correct methods defined": function () {
      assert.isFunction(haibu.plugins.logger.init);
    }
  }
}).export(module);