/*
 * spawner-test.js: Tests for the core `haibu` Spawner.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var vows = require('vows'),
    helpers = require('../helpers'),
    path = require('path'),
    fs = require('fs'),
    eyes = require('eyes'),
    assert = require('assert'),
    haibu = require('../../lib/haibu'),
    config = haibu.config;

var spawner = new haibu.Spawner({ maxRestart: 1 });

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
  helpers.requireStart(9010)
).addBatch({
  "An instance of haibu.Spawner": {
    "when passed a valid app json with submodules": {
      topic: appWithSubmodules,
      "the trySpawn() method": {
        topic: function (app) {
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
    }
  }
}).addBatch({
  "An instance of haibu.Spawner": {
    "when passed a valid app json with bad dependencies": {
      "the trySpawn() method": {
        topic: function () {
          var sourceDir = path.join(__dirname, '..', 'fixtures', 'repositories', 'bad-start'),
              pkgJson = fs.readFileSync(path.join(sourceDir, 'package.json')),
              npmApp = JSON.parse(pkgJson);

          npmApp.user = 'charlie';
          npmApp.repository.directory = sourceDir;
          repo = haibu.repository.create(npmApp);
          spawner.trySpawn(repo, this.callback);
        },
        "should return an error with the correct stack trace": function (err, result) {
          assert.isNotNull(err);
          assert.isTrue(typeof result === 'undefined');
          assert.equal(err.message, 'Error spawning drone');
          
          //
          // Assert that the correct error message from the drone was passed 
          // back up the callback chain.
          //
          var errLine = err.stderr.split('\n').filter(function (line) {
            return line.indexOf("Cannot find module 'badmodule'") > -1;
          })[0];
          assert.isString(errLine);
        }
      }
    }
  }
}).addBatch({
  "An instance of haibu.Spawner": {
    "when passed a valid app json": {
      topic: app,
      "the trySpawn() method": {
        topic: function (app) {
          spawner.trySpawn(app, this.callback);
        },
        "should return a valid drone result object": function (err, result) {
          assert.isNull(err);
          assert.isNotNull(result.drone);
          result.process.kill();
        }
      }
    }
  }
}).addBatch({
  "An instance of haibu.Spawner": {
    "when passed a valid app json with npm dependencies": {
      "the trySpawn() method": {
        topic: function () {
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
    }
  }
}).addBatch({
  "An instance of haibu.Spawner": {
    "when passed a valid app json with environment variables": {
      "the trySpawn() method": {
        topic: function () {
          var that = this,
              sourceDir = path.join(__dirname, '..', 'fixtures', 'repositories', 'env-vars'),
              pkg = this.pkg = fs.readFileSync(path.join(sourceDir, 'package.json')),
              envApp = JSON.parse(pkg);

          envApp.user = 'charlie';
          envApp.repository.directory = sourceDir;
          this.repo = haibu.repository.create(envApp);
          
          spawner.trySpawn(this.repo, function (err, result) {
            if (err) {
              return that.callback(err);
            }
            
            result.process.stdout.on('data', that.callback.bind(that, null, result.process));
          });
        },
        "should output the expected `username:password`": function (err, child, result) {
          assert.isNull(err);
          result = result.toString().split(':');
          assert.lengthOf(result, 2);
          assert.equal(result[0], this.repo.app.env['username']);
          assert.equal(result[1], this.repo.app.env['password']);
          child.kill();
        }
      }
    }
  }
}).addBatch({
  "When the tests are over": {
    topic: function () {
      setTimeout(this.callback, 5000);
    },
    "wait for the log buffer to flush": function () {
      assert.isTrue(true);
    }
  }
}).export(module);