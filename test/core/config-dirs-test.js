/*
 * config-test.js: Tests for the 'config' module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var vows = require('vows'),
    helpers = require('../helpers'),
    fs = require('fs'),
    path = require('path'),
    eyes = require('eyes'),
    assert = require('assert'),
    haibu = require('../../lib/haibu');

vows.describe('haibu/config/directories').addBatch({
  "When using haibu": {
    "the initDirectories() method": {
      topic: function () {
        haibu.utils.initDirectories(this.callback);
      },
      "should create the appropriate directories": function (err, paths) {
        assert.isNull(err);
        paths.forEach(function (dir) {
          try {
            assert.isNotNull(fs.statSync(dir));
          }
          catch (ex) {
            // If this operation fails, fail the test
            assert.isNull(ex);
          }
        });
      }
    }
  }
}).export(module);
