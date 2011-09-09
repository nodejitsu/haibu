/*
 * chroot-test.js: Tests for the `chroot` plugin responsible for enforcing chroot on spawned apps.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    exec = require('child_process').exec,
    fs = require('fs'),
    path = require('path'),
    eyes = require('eyes'),
    vows = require('vows'),
    helpers = require('../helpers'),
    haibu = require('../../lib/haibu'),
    config = haibu.config;

var repo, npmApp, app = {
  "name": "test",
  "user": "marak",
  "repository": {
    "type": "git",
    "url": "https://github.com/Marak/hellonode.git",
    "branch": "master"
  },
  "scripts": {
    "start": "server.js"
  },
  "directories": {
    "home": "hellonode"
  }
};

vows.describe('haibu/plugins/chroot').addBatch(
  helpers.requireHook()
).addBatch({
  "This test requires the chroot plugin": {
    topic: function () {
      haibu.use(haibu.plugins.chroot, this.callback);
    },
    "should respond without an error": function (err, dirs) {
      assert.isNull(err);
    }
  }
}).addBatch({
  "This test requires the chroot directory": {
    topic: function () {
      var that = this,
          root = haibu.config.get('chroot:root'),
          directories;

      directories = [
        root,
        path.join(root, 'usr', 'local', 'lib', 'node'),
        path.join(root, 'usr', 'local', 'bin'),
        path.join(root, 'tmp')
      ];

      exec('mkdir -p ' + directories.join(' '), function () {
        that.callback();
      });
    },
    "should create the chroot directory": function () {
      assert.isTrue(true);
    }
  }
}).addBatch({
  "An instance of haibu.Spawner": {
    topic: function (spawner) {
      return new haibu.Spawner({ chroot: true, maxRestart: 1 });
    },
    "when passed a valid app json": {
      "the trySpawn() method": {
        topic: function (spawner) {
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
              pkgJson = fs.readFileSync(path.join(sourceDir, 'package.json'));
              
          npmApp = JSON.parse(pkgJson);
          npmApp.user = 'charlie';
          npmApp.repository.directory = sourceDir;
          repo = haibu.repository.create(npmApp);
          spawner.trySpawn(repo, this.callback);
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
  "An instance of the Npm repository": {
    "the allDependencies() method": {
      topic: function () {
        var that = this;
        new (haibu.drone.Drone)().clean(npmApp, function (err) {
          if (err) {
            that.callback(err);
          }

          path.exists(repo.homeDir, that.callback.bind(null, null));
        });
      },
      "should remove the dependencies from the node_modules directory": function (err, exists) {
        assert.isTrue(!err);
        assert.isFalse(exists);
      }
    }
  }
}).export(module);
