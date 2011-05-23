/*
 * spawner-test.js: Tests for the core `haibu` Spawner.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

require.paths.unshift(require('path').join(__dirname, '..', '..', 'lib'));

var vows = require('vows'),
    helpers = require('../helpers'),
    path = require('path'),
    fs = require('fs'),
    eyes = require('eyes'),
    assert = require('assert'),
    haibu = require('haibu'),
    config = require('haibu').config;

var app = {
  "name": "test",
  "user": "marak",
  "repository": {
    "type": "git",
    "url": "http://github.com/Marak/hellonode.git",
    "branch": "master"
  },
  "scripts": {
    "start": "server.js"
  },
  "directories": {
    "home": "hellonode"
  }
};

var appWithSubmodules = {
  "name": "exceptiony",
  "user": "charlie",
  "repository": {
    "type": "git",
    "url": "http://github.com/indexzero/exceptiony.git"
  },
  "scripts": {
    "start": "server.js"
  },
  "directories": {
    "home": "exceptiony"
  }
};

vows.describe('haibu/core/spawner').addBatch(
  helpers.requireInit()
).addBatch({
  "An instance of haibu.Spawner" : {
    topic: function () {
      return new haibu.Spawner({ maxRestart: 1 });
    },
    "when passed a valid app json": {
      topic: app,
      "the trySpawn() method": {
        topic: function (app, spawner) {
          spawner.trySpawn(app, this.callback);
        },
        "should return a valid drone result object": function (err, result) {
          assert.isNull(err);
          assert.isNotNull(result.drone);
          result.process.kill();
        }
      }
    },
    "when passed a valid app json with npm dependencies": {
      "the trySpawn() method": {
        topic: function (spawner) {
          var sourceDir = path.join(__dirname, '..', 'fixtures', 'repositories', 'npm-deps'),
              pkgJson = fs.readFileSync(path.join(sourceDir, 'package.json')),
              npmApp = JSON.parse(pkgJson);

          npmApp.user = 'charlie';
          npmApp.repository.directory = sourceDir;
          this.repo = haibu.repository.create(npmApp);
          spawner.trySpawn(this.repo, this.callback);
        },
        "should return a valid drone result object": function (err, result) {
          assert.isNull(err);
          assert.isNotNull(result.drone);
          result.process.kill();
          
          var homeFiles = fs.readdirSync(this.repo.homeDir);
          assert.include(homeFiles, 'node_modules');
          
          var modules = fs.readdirSync(path.join(this.repo.homeDir, 'node_modules'));
          assert.include(modules, 'express');
        }
      }
    },
    "when passed a valid app json with submodules": {
      topic: appWithSubmodules,
      "the trySpawn() method": {
        topic: function (app, spawner) {
          spawner.trySpawn(app, this.callback);
        },
        "should return a valid drone result object": function (err, result) {
          assert.isNull(err);
          assert.isNotNull(result.drone);
          result.process.kill();
          
          // Ensure that the submodule's (vendor/proto) has files
          try {
            var submodulePath = path.join(config.get('directories:apps'), 'charlie', 'exceptiony', 'exceptiony', 'vendor', 'proto');
            assert.isTrue(fs.readdirSync(submodulePath).length > 0);
          }
          catch (ex) {
            assert.isNull(ex);
          }
        }
      }
    },
    "when passed a valid app json with bad dependencies": {
      "the trySpawn() method": {
        topic: function (spawner) {
          var that = this,
              sourceDir = path.join(__dirname, '..', 'fixtures', 'repositories', 'bad-app'),
              pkgJson = fs.readFileSync(path.join(sourceDir, 'package.json')),
              npmApp = JSON.parse(pkgJson);

          npmApp.user = 'charlie';
          npmApp.repository.directory = sourceDir;
          repo = haibu.repository.create(npmApp);
          spawner.trySpawn(repo, function (err, result) {
            setTimeout(function () {
              that.callback(err, result);
            }, 2000);
          });
        },
        "should return a valid drone result object": function (err, result) {
          assert.isNotNull(err);
          assert.isTrue(typeof result === 'undefined');
        }
      }
    }
  }
}).export(module);
