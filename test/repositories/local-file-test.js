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
    eyes = require('eyes'),
    vows = require('vows'),
    helpers = require('../helpers'),
    haibu = require('../../lib/haibu');

var ipAddress = '127.0.0.1', 
    port = 9000, 
    app = {
       "name": "test",
       "user": "marak",
       "directories": {
         "home": "hellonode"
       },
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
        assert.isFunction(localFile.exists);
        assert.isFunction(localFile.update);
        assert.isFunction(localFile.fetch);
      },
      "the fetch() method": {
        topic: function (localFile) {
          localFile.fetch(this.callback);
        },
        "use the local filesystem": function (err, localFile) {
          try {
            assert.isNotNull(fs.statSync(localFile));
          }
          catch (ex) {
            // If this operation fails, fail the test
            assert.isNull(ex);
          }
        }
      }
    }
  }
}).addBatch({
  "When using haibu": {
    "an instance of the LocalFile repository": {
      topic: function () {
        return haibu.repository.create(app);
      },
      "should be a valid repository": function (localFile) {
        assert.instanceOf(localFile, haibu.repository.Repository);
      },
      "the init() method": {
        topic: function (localFile) {
          var self = this;
          exec('rm -rf ' + path.join(localFile.appDir, '*'), function(err) {
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