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
    },
    app2 = {
      "name": "test2",
      "user": "marak",
      "repository": {
        "type": "create",
        "url": "https://github.com/Marak/hellonode.git",
      },
      "scripts": {
        "start": "server.js"
      }
    },
    appMalformed = {
    };

function newRepo(app, options) {
};

vows.describe('haibu/repositories/core').addBatch(
  helpers.requireInit()
).addBatch({
  "When using haibu, ": {
    "get the haibu.repository module": {
      topic: function () {
        return haibu.repository;
      },
      "should have store functions": function (repo) {
        assert.isObject(repo);
        assert.isFunction(repo.create);
        assert.isFunction(repo.add);
        assert.isFunction(repo.remove);
        assert.isFunction(repo.list);
        assert.isFunction(repo.validate);
      },
      "executing the add() method": {
        topic: function (repo) {
          this.callback(repo.add('test', newRepo));
        },
        "should add a new repo type": function (err) {
        },
        "with existing repository type": {
          topic: function (repo) {
            this.callback(null, repo.add('test', newRepo));
          },
          "should return an Error object": function (err, repoTest) {
              assert.instanceOf(repoTest, Error);
          }
        }
      },
      "executing the list() method": {
        topic: function (repo) {
          return repo.list();
        },
        "should list all repo types": function (list) {
          assert.isArray(list);
          assert.include(list, 'git');
          assert.include(list, 'tar');
          assert.include(list, 'zip');
          assert.include(list, 'local');
        }
      },
      "executing the remove() method": {
        topic: function (repo) {
          repo.add('test2', newRepo);
          if (repo.remove('test2')) return false;
          return repo.list();
        },
        "should remove a repo type": function (list) {
            assert.isArray(list);
            assert.equal(list.indexOf('test2'), -1);
        }
      },
      "executing the create() method": {
        topic: function (repo) {
          repo.add('create', newRepo);
          return repo.create(app, {});
        },
        "should return a repo instance": function (repo) {
          assert.instanceOf(repo, newRepo);
        },
        "with a malformed app definition": {
          topic: function (newRepo, repo) {
            return repo.create(appMalformed, {});
          },
          "should return an Error object": function (err, repoTest) {
              assert.instanceOf(repoTest, Error);
          }
        }
      },
      "getting an instance of the Repository class": {
        topic: function (repo) {
          return new repo.Repository(app2, { appsDir: '/this/is/a/path'});
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
            self = this;
            repo.appsDir = haibu.config.get('directories:apps');
            exec('rm -rf ' + path.join(repo.appDir, '*'), function(err) {
              repo.mkdir(self.callback);
            })
          },
          "should create the apps directory": function (err, ready) {
            assert.isTrue(ready);
            try {
              assert.isNotNull(fs.statSync(path.join(haibu.config.get('directories:apps'), app2.user, app2.name)));
            } catch (ex) {
              // If this operation fails, fail the test
              assert.isNull(ex);
            }
          },
          "plus the installDependencies() method with package.json": {
            topic: function (ready, repo, repositories) {
              self = this;
              exec('cp -r ' + path.join(__dirname, '..', 'fixtures', 'repositories', 'local-file-dependencies') + ' ' + repo.homeDir, function (err) {
                if (err) self.callback(err);
                repo.installDependencies(self.callback);
              });
            },
            "should install the 'color' package at the correct location": function (err, packages) {
              assert.isArray(packages);
              try {
                assert.isNotNull(fs.statSync(path.join(haibu.config.get('directories:apps'), app2.user, app2.name, 'home1', 'node_modules', 'color')));
              } catch (ex) {
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
                } catch (ex) {
                  // If this operation fails, fail the test
                  assert.isNull(ex);
                }
              }
            } 
          } 
        }
        // TODO: add tests for all Repository class functions!!
      }
    }
  }
}).export(module);