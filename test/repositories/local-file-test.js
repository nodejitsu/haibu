/*
 * remote-file-test.js: Tests for LocalFile repository.
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
         "type": "local",
         "directory": path.join(__dirname, '..', 'fixtures', 'repositories', 'local-file'),
       },
       "scripts": {
         "start": "server.js"
       }
    };
    
vows.describe('haibu/repositories/local-file').addBatch(helpers.requireInit()).addBatch({
  "When using haibu": {
    "an instance of the LocalFile repository": {
      topic: function () {
        return haibu.repository.create(app);
      },
      "should be a valid repository": function (localFile) {
        assert.instanceOf(localFile, haibu.repository.Repository);
        assert.isFunction(localFile.init);
        assert.isFunction(localFile.fetch);
      },
      "the fetch() method": {
        topic: function (localFile) {
          localFile.fetch(this.callback);
        },
        "should find the local app directory": function (err, localFile) {
          try {
            assert.isNotNull(fs.statSync(localFile));
          }
          catch (ex) {
            // If this operation fails, fail the test
            assert.isNull(ex);
          }
        }
      },
      "the init() method": {
        topic: function (localFile) {
          var self = this;
          if (!(localFile instanceof haibu.repository.Repository)) return localFile;
          exec('rm -rf ' + path.join(localFile.appDir, '*'), function (err) {
            localFile.mkdir(function (err, created) {
              if (err) self.callback(err);
              localFile.init(self.callback);
            });
          });
        },
        "should install to the specified location": function (err, success, files) {
          assert.isNull(err);
          assert.isArray(files);
        }
      }
    }
  }
}).export(module);