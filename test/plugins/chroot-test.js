/*
 * chroot-test.js: Tests for the `chroot` plugin responsible for enforcing chroot on spawned apps.
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
    exec = require('child_process').exec,
    assert = require('assert'),
    haibu = require('haibu'),
    config = require('haibu').config;

var repo, app = {
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

vows.describe('haibu/plugins/chroot').addBatch(helpers.requireInit())
.addBatch({
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
          root = haibu.config.get('directories:chroot'),
          directories;

      directories = [
        root,
        path.join(root, 'usr', 'local', 'lib', 'node'),
        path.join(root, 'usr', 'local', 'bin'),
        path.join(root, 'tmp')
      ];

      exec('mkdir -p ' + directories.join(' '), function () {
        exec('cp ' + path.join(__dirname, '..', '..', 'bin', 'carapace') + ' ' + haibu.config.get('directories:apps'), function () {
          that.callback();
        });
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
              pkgJson = fs.readFileSync(path.join(sourceDir, 'package.json')),
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
    "the clean() method": {
      topic: function () {
        var that = this;
        repo.clean(function (err, dependencies, list) {
          if (err) {
            that.callback(err);
          }

          fs.readdir(repo.npmConfig.root, function (err, files) {
            that.callback(null, files, dependencies);
          })
        });
      },
      "should remove the dependencies from the npm directory": function (err, files, dependencies) {
        assert.isNull(err);
        assert.isArray(dependencies);

        dependencies.forEach(function (dep) {
          assert.isTrue(files.indexOf(dep) === -1);
        });
      }
    }
  }
}).export(module);
