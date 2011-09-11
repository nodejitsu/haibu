/*
 * remote-file-test.js: Tests for RemoteFile repository.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    eyes = require('eyes'),
    vows = require('vows'),
    helpers = require('../helpers'),
    haibu = require('../../lib/haibu'),
    RemoteFile = require('../../lib/haibu/repositories/remote-file').RemoteFile;

var config = helpers.loadConfig(false) || {};
    
var cloudfilesApp = {
  "name": "test",
  "user": "charlie",
  "repository": {
    "type": "tar",
    "protocol": "cloudfiles",
    "auth": config.auth,
    "container": "nodejitsu-apps",
    "filename": "hellonode.tar.gz"
  },
  "scripts": {
    "start": "server.js"
  }
};

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

var suite = vows.describe('haibu/repositories/remote-file');

// skip cloudfiles tests if no authentication available
if (!config.auth) {
  suite.addBatch({
    "When using haibu": {
      "Config file test/fixtures/test-config.json doesn't have valid data": {
        "so skipping cloudfiles tests": function () {
          assert.isNull(null);
        }
      }
    }
  });
} 
else {
  //
  // Cloudfiles remote tests
  //
  suite.addBatch(
    helpers.requireInit(function () {
      remoteFile = new RemoteFile(cloudfilesApp);
    })
  ).addBatch({
    "When using haibu": {
      "an instance of the RemoteFile repository": {
        "should be a valid repository": function () {
          assert.isFunction(remoteFile.fetch);
          assert.isFunction(remoteFile.fetchHttp);
          assert.isFunction(remoteFile.fetchCloudfiles);
        },
        "the fetchCloudfiles() method": {
          topic: function () {
            var options = {
              container: 'nodejitsu-apps',
              filename: 'hellonode.tar.gz'
            };
          
            remoteFile.fetchCloudfiles(options, this.callback);
          },
          "should download the package to the correct local file": function (err, localFile) {
            try {
              assert.isNotNull(fs.statSync(localFile));
              fs.unlinkSync(localFile);
            }
            catch (ex) {
              // If this operation fails, fail the test
              assert.isNull(ex);
            }
          }
        }
      }
    }
  });
}

suite.addBatch(
  helpers.requireInit(function () {
    remoteFile = new RemoteFile(httpApp);
  })
).addBatch({
  "When using haibu": {
    "an instance of the RemoteFile repository": {
      "the fetchHttp() method": {
        topic: function () {
          remoteFile.fetchHttp('http://c0027507.cdn1.cloudfiles.rackspacecloud.com/hellonode.tar.gz', this.callback);
        },
        "should download the package to the correct local file": function (err, localFile) {
          try {
            assert.isNotNull(fs.statSync(localFile));
            fs.unlinkSync(localFile);
          }
          catch (ex) {
            // If this operation fails, fail the test
            assert.isNull(ex);
          }
        }
      }
    }
  }
});

//
// Export the suite to the test module
//
suite.export(module);