/*
 * store-test.js: Tests for the repository store.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    exec = require('child_process').exec,
    vows = require('vows'),
    helpers = require('../helpers'),
    haibu = require('../../lib/haibu');

var app = {
  "name": "test",
  "user": "marak",
  "repository": {
    "type": "create",
    "url": "https://github.com/Marak/hellonode.git",
  },
  "scripts": {
    "start": "server.js"
  }
};

var app2 = {
  "name": "test2",
  "user": "marak",
  "repository": {
    "type": "create",
    "url": "https://github.com/Marak/hellonode.git",
  },
  "scripts": {
    "start": "server.js"
  }
};

var appMalformed = {};

function newRepo(app, options) { }

vows.describe('haibu/repositories/core').addBatch(helpers.requireInit()).addBatch({
  "When using the repository module": {
    "should have store functions": function () {
      assert.isObject(haibu.repository);
      assert.isFunction(haibu.repository.create);
      assert.isFunction(haibu.repository.add);
      assert.isFunction(haibu.repository.remove);
      assert.isFunction(haibu.repository.list);
      assert.isFunction(haibu.repository.validate);
    },
    "the add() method": {
      "should add a new repo type": function () {
        haibu.repository.add('test', newRepo);
        assert.include(haibu.repository.list(), 'test');
      },
      "with existing repository type": {
        "should throw an error": function () {
          assert.throws(function () {
            haibu.repository.add('test', newRepo);
          });
        }
      }
    },
    "the list() method": {
      topic: haibu.repository.list(),
      "should list all repo types": function (list) {
        assert.isArray(list);
        assert.include(list, 'git');
        assert.include(list, 'tar');
        assert.include(list, 'zip');
        assert.include(list, 'local');
      }
    },
    "the remove() method": {
      topic: function () {
        haibu.repository.add('test2', newRepo);
        return haibu.repository.remove('test2')
          ? false
          : haibu.repository.list();
      },
      "should remove a repo type": function (list) {
        assert.isArray(list);
        assert.equal(list.indexOf('test2'), -1);
      }
    },
    "the create() method": {
      topic: function () {
        haibu.repository.add('create', newRepo);
        return haibu.repository.create(app, {});
      },
      "should return a repo instance": function (repo) {
        assert.instanceOf(repo, newRepo);
      },
      "with a malformed app definition": {
        "should return an Error object": function (err, repoTest) {
          assert.throws(function () {
            repo.create(appMalformed, {});
          });
        }
      }
    }
  },
  "an instance of the Repository class": {
    topic: function (repo) {
      return new haibu.repository.Repository(app2, { appsDir: '/this/is/a/path'});
    },
    "should return a Repository instance": function (repo) {
      assert.instanceOf(repo, haibu.repository.Repository);
      assert.isFunction(repo.validate);
      assert.isFunction(repo.installDependencies);
      assert.isFunction(repo.stat);
      assert.isFunction(repo.mkdir);
      assert.isFunction(repo.bootstrap);
      assert.equal(repo.userDir, path.join('/this/is/a/path', app2.user));
      assert.equal(repo.appDir, path.join('/this/is/a/path', app2.user, app2.name));
      repo._setHome('home1');
      assert.equal(repo.homeDir, path.join('/this/is/a/path', app2.user, app2.name, 'home1'));
    },
    "executing the mkdir() method": {
      topic: function (repo, repositories) {
        var self = this;
        repo.appsDir = haibu.config.get('directories:apps');
        exec('rm -rf ' + path.join(repo.appDir, '*'), function (err) {
          repo.mkdir(self.callback);
        })
      },
      "should create the apps directory": function (err, ready) {
        assert.isTrue(ready);
        try {
          assert.isNotNull(fs.statSync(path.join(haibu.config.get('directories:apps'), app2.user, app2.name)));
        } 
        catch (ex) {
          // If this operation fails, fail the test
          assert.isNull(ex);
        }
      },
      "plus the installDependencies() method with package.json": {
        topic: function (ready, repo, repositories) {
          var self = this;
          exec('cp -r ' + path.join(__dirname, '..', 'fixtures', 'repositories', 'local-file-dependencies') + ' ' + repo.homeDir, function (err) {
            if (err) {
              return self.callback(err);
            }
            
            repo.installDependencies(self.callback);
          });
        },
        "should install the 'color' package at the correct location": function (err, packages) {
          assert.isArray(packages);
          try {
            assert.isNotNull(fs.statSync(path.join(haibu.config.get('directories:apps'), app2.user, app2.name, 'home1', 'node_modules', 'color')));
          } 
          catch (ex) {
            // If this operation fails, fail the test
            assert.isNull(ex);
          }
        },
        "and also with app.dependencies": {
          topic: function (packages, ready, repo, repositories) {
            repo._setHome('home2');
            repo.app.dependencies = {"color": "x.x.x"};
            repo.installDependencies(this.callback);
          },
          "should install the 'color' package at the correct location": function (err, packages) {
            assert.isArray(packages);
            try {
              assert.isNotNull(fs.statSync(path.join(haibu.config.get('directories:apps'), app2.user, app2.name, 'home2', 'node_modules', 'color')));
            } 
            catch (ex) {
              // If this operation fails, fail the test
              assert.isNull(ex);
            }
          }
        } 
      } 
    }
  }
}).export(module);