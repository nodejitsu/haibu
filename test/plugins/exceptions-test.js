/*
 * exceptions-test.js: Tests for the haibu `exceptions` plugin.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    vows = require('vows'),
    haibu = require('../../lib/haibu'),
    helpers = require('../helpers');
    
var config = helpers.loadConfig();

vows.describe('haibu/plugins/exceptions').addBatch({
  "When using the exception plugin": {
    "it should have the correct methods defined": function () {
      assert.isFunction(haibu.plugins.exceptions.init);
    },
    "it should initalize correctly": function () {
      haibu.use(haibu.plugins.exceptions, config);
      var phandlers = process._events['uncaughtException'];
      assert.isTrue(typeof phandlers === 'function' || (Array.isArray(phandlers) && phandlers.length === 1));
    }
  }
}).export(module);