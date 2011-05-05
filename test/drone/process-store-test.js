/*
 * drone-test.js: Tests for the `Drone` resource.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

require.paths.unshift(require('path').join(__dirname, '..', '..', 'lib'));
require.paths.unshift(require('path').join(__dirname, '..'));

var sys = require('sys'),
    vows = require('vows'),
    path = require('path'),
    fs = require('fs'),
    eyes = require('eyes'),
    assert = require('assert'),
    data = require('fixtures/apps'),
    haibu = require('haibu'),
    helpers = require('../helpers');

var app = data.apps[0], store;

//
// Add a user property to the app
//
app.user = 'marak';

vows.describe('haibu/drone/process-store').addBatch(
  helpers.requireInit(function () {
    store = new haibu.ProcessStore();
  })
).addBatch({
  "An instance of haibu.ProcessStore": {
    "the save() method": {
      topic: function () {
        var that = this;
        store.save(app.name, app, function (err, filepath) {
          fs.stat(filepath, that.callback);
        });
      },
      "should save the file correctly": function (err, stats) {
        assert.isNull(err);
        assert.isNotNull(stats);
        assert.isTrue(stats.isFile());
      }
    }
  }
}).export(module);
