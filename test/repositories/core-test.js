/*
 * store-test.js: Tests for the repository store.
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

var called = false; 

function newRepo(app, options) {
  called = true;
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
        "should return a repo instance": function (newRepo) {
            assert.isTrue(called);
        },
        "with a malformed app definition": {
          topic: function (newRepo, repo) {
            called = false;
            return repo.create(appMalformed, {});
          },
          "should return an Error object": function (err, repoTest) {
              assert.instanceOf(repoTest, Error);
          }
        }
      }
    }
  }
}).export(module);