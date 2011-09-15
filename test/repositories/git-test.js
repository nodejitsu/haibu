/*
 * git.js: Tests for the Git repository.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    path = require('path'),
    exec = require('child_process').exec,
    vows = require('vows'),
    helpers = require('../helpers'),
    haibu = require('../../lib/haibu');

var app = {
      "name": "test",
      "user": "marak",
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
  "When using haibu,": {
    "an instance of the Git repository": {
      topic: function () {
        return haibu.repository.create(app);
      },
      "should be a valid repository": function (git) {
        assert.instanceOf(git, haibu.repository.Repository);
        assert.isFunction(git.init);
      },
      "the init() method": {
        topic: function (git) {
          var self = this;
          if (!(git instanceof haibu.repository.Repository)) return git;
          exec('rm -rf ' + path.join(git.appDir, '*'), function (err) {
            git.mkdir(function (err, created) {
              if (err) self.callback(err);
              git.init(self.callback);
            })
          })
        },
        "should install to the specified location": function (err, success, files) {
          assert.isNull(err);
          assert.isArray(files);
        }
      }
    }
  }
}).export(module);
