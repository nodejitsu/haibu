/*
 * remote-file-test.js: Tests for RemoteFile repository.
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
    assert = require('assert'),
    haibu = require('haibu'),
    RemoteFile = require('haibu/repositories/remote-file').RemoteFile;

var ipAddress = '127.0.0.1', 
    port = 9000, remoteFile,
    app = {
      "name": "test",
      "user": "marak",
      "directories": {
        "home": "hellonode"
      },
      "repository": {
        "auth": helpers.auth,
        "protocol": "cloudfiles",
        "container": "nodejitsu-apps",
        "filename": "hellonode.tar.gz",
        "type": "tar"
      },
      "scripts": {
        "start": "server.js"
      }
    };

var suite = vows.describe('haibu/repositories/remote-file').addBatch(
  helpers.requireInit(function () {
    remoteFile = new RemoteFile(app);
  })
).addBatch({
  "When using haibu": {
    "an instance of the RemoteFile repository": {
      "should be a valid repository": function () {
        assert.isFunction(remoteFile.init);
        assert.isFunction(remoteFile.exists);
        assert.isFunction(remoteFile.update);
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
}).addBatch({
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

if (helpers.auth) { 
  //
  // If there is no config file, we can't run the remote tests
  //
  suite.export(module);
}