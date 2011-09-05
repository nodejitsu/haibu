/*
 * git.js: Tests for the Git repository.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    path = require('path'),
    eyes = require('eyes'),
    vows = require('vows'),
    helpers = require('../helpers'),
    haibu = require('../../lib/haibu');

var ipAddress = '127.0.0.1',
    port = 9000,
    app = {
      "name": "test",
      "user": "marak",
      "directories": {
        "home": "hellonode"
      },
      "repository": {
        "type": "git",
        "url": "https://github.com/Marak/hellonode.git",
        "branch": "master"
      },
      "scripts": {
        "start": "server.js"
      }
    };

vows.describe('haibu/repositories/git').addBatch(
  helpers.requireInit()
).addBatch({
  "When using haibu": {
    "an instance of the Git repository": {
      topic: function () {
        return haibu.repository.create(app);
      },
      "should be a valid repository": function (git) {
        assert.instanceOf(git, haibu.repository.Repository);
        assert.isFunction(git.init);
        assert.isFunction(git.exists);
        assert.isFunction(git.update);
      }
    }
  }
}).export(module);
