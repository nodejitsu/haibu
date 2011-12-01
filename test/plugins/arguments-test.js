/*
 * arguments-test.js: Tests for the `arguments` plugin.
 *
 * (C) 2010, Nodejitsu Inc.
 * (C) 2011, Sander Tolsma
 *
 */

var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    vows = require('vows'),
    helpers = require('../helpers'),
    haibu = require('../../lib/haibu');

var repo, app;

vows.describe('haibu/plugins/arguments').addBatch(
  helpers.requireHook()
).addBatch({
  "This test requires the arguments plugin": {
    topic: function () {
      haibu.use(haibu.plugins.arguments, this.callback);
    },
    "should respond without an error": function (err, dirs) {
      assert.isNull(err);
    }
  }
}).addBatch({
  "An instance of haibu.Spawner": {
    topic: function (spawner) {
      return new haibu.Spawner({ maxRestart: 1 });
    },
    "when passed a valid app json": {
      "the trySpawn() method": {
        topic: function (spawner) {

          var that = this,
              sourceDir = path.join(__dirname, '..', 'fixtures', 'repositories', 'arg-vars'),
              pkgJson = fs.readFileSync(path.join(sourceDir, 'package.json'));
              
          app = JSON.parse(pkgJson);
          app.user = 'charlie';
          app.repository.directory = sourceDir;
          this.repo = haibu.repository.create(app);
          spawner.trySpawn(this.repo,  function (err, result) {
            if (err) {
              return that.callback(err);
            }
            
            result.process.stdout.on('data', that.callback.bind(that, null, result.process));
          });
        },
        "should output the expected variables": function (err, child, result) {
          assert.isNull(err);
          result = JSON.parse(result);
          assert.lengthOf(result, 12);
          assert.equal(result[2], '-w');
          assert.equal(result[3], 'firstwarg');
          assert.equal(result[4], '-h');
          assert.equal(result[5], process.env.HOME);
          assert.equal(result[6], '-a');
          assert.equal(result[7], this.repo.appDir);
          assert.equal(result[8], '-c');
          assert.equal(result[9], this.repo.homeDir);
          assert.equal(result[10], '-o');
          assert.equal(result[11], '%o');
          child.kill();
        }
      }
    }
  }
}).export(module);