/*
 * tar-test.js: Tests for Tar repository.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    path = require('path'),
    exec = require('child_process').exec,
    eyes = require('eyes'),
    vows = require('vows'),
    helpers = require('../helpers'),
    haibu = require('../../lib/haibu');

var config = helpers.loadConfig(false) || {};
    
var httpApp = {
  "name": "test",
  "user": "marak", 
  "repository": {
    "type": "tar",
    "protocol": "http",
    "url": "http://c0027507.cdn1.cloudfiles.rackspacecloud.com/hellonode.tar.gz"
  },
  "scripts": {
    "start": "server.js"
  }
};

var cloudfilesApp = {
  "name": "test",
  "user": "charlie",
  "repository": {
    "type": "tar",
    "protocol": "cloudfiles",
    "filename": "hellonode.tar.gz",
    "container": "nodejitsu-apps",
    "auth": config.auth
  },
  "scripts": {
    "start": "server.js"
  }
};

// Create the vows test suite
var suite = vows.describe('haibu/repositories/tar').addBatch(
  helpers.requireInit()
);

//
// Iterate over the two remote types we wish to execute
// identical tests for.
//
[httpApp, cloudfilesApp].forEach(function (app) {
  var remoteType = (app === httpApp) ? "http" : "cloudfiles";
  var tests = {};
  
  // skip cloudfiles tests if no authentication available
  if (!config.auth && app === cloudfilesApp) {
    tests["Config file test/fixtures/test-config.json doesn't have valid data"] = {
      "so skipping cloudfiles tests": function (obj) {
        assert.isTrue(true);
      }
    };
  } 
  else {
    tests["with an " + remoteType + " remote"] = {
      topic: function () {
        return haibu.repository.create(app);
      },
      "should be a valid repository": function (tar) {
        assert.instanceOf(tar, haibu.repository.Repository);
        assert.isFunction(tar.init);
        assert.isFunction(tar.fetchHttp);
        assert.isFunction(tar.fetchCloudfiles);
      },
      "the init() method": {
        topic: function (tar) {
          var self = this;
          if (!(tar instanceof haibu.repository.Repository)) return tar;
          exec('rm -rf ' + path.join(tar.appDir, '*'), function (err) {
            tar.mkdir(function (err, created) {
              if (err) self.callback(err);
              tar.init(self.callback);
            });
          });
        },
        "should untar to the specified location": function (err, success, packages, files) {
          assert.isNull(err);
          assert.isArray(packages);
          assert.isArray(files);
        }
      }
    };
  }
  
  var batch = {
    "When using haibu": {
      "an instance of the Tar repository": tests
    }
  };
  
  suite.addBatch(batch);
});

//
// Export the suite to the test module
//
suite.export(module);

