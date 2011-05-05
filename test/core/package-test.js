/*
 * package-test.js: Tests for haibu 'package.json'.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var vows = require('vows'),
    helpers = require('../helpers'),
    fs = require('fs'),
    path = require('path'),
    eyes = require('eyes'),
    assert = require('assert');

vows.describe('haibu/config/package.json').addBatch({
  "When using haibu": {
    "the package.json file": {
      topic: function () {
        fs.readFile(path.join(__dirname, '..', '..', 'package.json'), this.callback);
      },
      "should be a valid package.json file": function (err, data) {
        var package = JSON.parse(data.toString());
        assert.isObject(package);
      }
    }
  }
}).export(module);
