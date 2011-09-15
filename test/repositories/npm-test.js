/*
 * npm-test.js: Tests for Npm repository.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */
 
var assert = require('assert'),
    path = require('path'),
    exec = require('child_process').exec,
    vows = require('vows'),
    haibu = require('../../lib/haibu'),
    helpers = require('./../helpers');

var app = {
      "user": "marak",
      "name": "test",
      "repository": {
        "type": "npm",
        "package": "hook.io-helloworld"
      },
      "scripts": {
        "start": "server.js"
      }
    };    

vows.describe('haibu/repositories/npm').addBatch(
  helpers.requireInit()
).addBatch({
  "When using haibu": {
    "an instance of the Npm repository": {
      topic: function () {
        return haibu.repository.create(app);
      },
      "should be a valid repository": function (npm) {
        assert.instanceOf(npm, haibu.repository.Repository);
        assert.isFunction(npm.init);
        assert.isFunction(npm.installDependencies);
      },
      "the init() method": {
        topic: function (npm) {
          var self = this;
          if (!(npm instanceof haibu.repository.Repository)) return npm;
          exec('rm -rf ' + path.join(npm.appDir, '*'), function (err) {
            npm.mkdir(function (err, created) {
              if (err) self.callback(err);
              npm.init(self.callback);
            })
          })
        },
        "should install to the specified location": function (err, updated, installed) {
          assert.isNull(err);
          assert.isTrue(updated);
          assert.isArray(installed);
        }
      }
    }
  }
}).export(module);