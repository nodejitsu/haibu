/*
 * zip-test.js: Tests for Zip repository.
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
    config = helpers.loadConfig(false) || {},
    cloudfilesApp,
    httpApp;
    
httpApp = {
  "name": "test",
  "user": "marak",
  "repository": {
    "type": "zip",
    "protocol": "http",
    "url": "http://c0027507.cdn1.cloudfiles.rackspacecloud.com/hellonode.zip"
  },
  "scripts": {
    "start": "server.js"
  }
};

cloudfilesApp = {
  "name": "test",
  "user": "charlie",
  "repository": {
    "type": "zip",
    "protocol": "cloudfiles",
    "filename": "hellonode.zip",
    "container": "nodejitsu-apps",
    "auth": config.auth
  },
  "scripts": {
    "start": "server.js"
  }
};

// Create the vows test suite
var suite = vows.describe('haibu/repositories/zip').addBatch(
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
      topic: function () {
        return {};
      },
      "so skipping cloudfiles tests": function(obj) {
      }
    };
  } else {
    tests["with an " + remoteType + " remote"] = {
      topic: function () {
        return haibu.repository.create(app);
      },
      "should be a valid repository": function (zip) {
        assert.instanceOf(zip, haibu.repository.Repository);
        assert.isFunction(zip.init);
        assert.isFunction(zip.exists);
        assert.isFunction(zip.update);
        assert.isFunction(zip.fetchHttp);
        assert.isFunction(zip.fetchCloudfiles);
      },
      "the init() method": {
        topic: function (zip) {
          zip.init(this.callback);
        },
        "should unzip to the specified location": function (err, success, files) {
          assert.isNull(err);
          assert.isArray(files);
        }
      }
    };
  }

  var batch = {
    "When using haibu": {
      "an instance of the Zip repository": tests
    }
  };

  suite.addBatch(batch);
});

//
// Export the suite to the test module
//
suite.export(module);