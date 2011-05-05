/*
 * npm-test.js: Tests for Npm repository.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */
 
require.paths.unshift(require('path').join(__dirname, '..', '..', 'lib'));

var vows = require('vows'),
    path = require('path'),
    eyes = require('eyes'),
    assert = require('assert'),
    haibu = require('haibu'),
    Npm = require('haibu/repositories/npm').Npm,
    helpers = require('./../helpers');

var ipAddress = '127.0.0.1', 
    port = 9000, npm,
    app = {
      "name": "test",
      "user": "marak",
      "directories": {
        "home": "hellonode"
      },
      "repository": {
        "type": "zip",
        "protocol": "http",
        "url": "http://c0027507.cdn1.cloudfiles.rackspacecloud.com/hellonode.zip",
      },
      "dependencies": {
        "translate": ">= 0.3.3"
      },
      "scripts": {
        "start": "server.js"
      }
    };    

vows.describe('haibu/repositories/npm').addBatch(
  helpers.requireInit(function () {
    npm = new Npm(app);
  })
).addBatch({
  "When using haibu": {
    "an instance of the Npm repository": {
      "should be a valid repository": function () {
        assert.equal(haibu.repository.validate(npm.app).valid, true);
        assert.isFunction(npm.init);
        assert.isFunction(npm.exists);
        assert.isFunction(npm.update);
      }
    }
  }
}).addBatch({
  "When using haibu": {
    "an instance of the Npm repository": {
      "the update() method": {
        topic: function () {
          npm.update(this.callback);
        },
        "should reset the local files in the repository": function (err, updated, installed) {
          assert.isNull(err);
          assert.isTrue(updated);
          assert.isArray(installed);
        }
      },
    }
  }
}).export(module);