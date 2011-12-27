/*
 * deploy-test.js: start a drone with a single PUT request.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    path = require('path'),
    url = require('url'),
    fs = require('fs')
    vows = require('vows'),
    request = require('request'),
    helpers = require('../helpers'),
    haibu = require('../../lib/haibu');

var fixtureDir = path.join(__dirname, '..', 'fixtures'),
    helloTarball = path.join(fixtureDir , 'repositories', 'streaming', 'hn.tar.gz'),
    brokenTarball = path.join(fixtureDir , 'repositories', 'streaming', 'broken.tar'),
    appPort;
  
vows.describe('haibu/drone/deploy').addBatch(
  helpers.requireStart(9011)
).addBatch({
  "Before testing streaming deploys": {
    topic: function () { 
      request({ url: 'http://localhost:9011/drones/running' }, this.callback);
    },
    "there should be no apps running": function (err, res, body) {
      var apps = JSON.parse(body);
      assert.deepEqual(apps, []);
    }
  }
}).addBatch({
  "Deploying to haibu in a single PUT": {
    "with a valid tarball": {
      topic: function () {
        var deployStream = fs.createReadStream(helloTarball),
            reqStream;

        reqStream = request({
          url: 'http://localhost:9011/deploy/test/hellonode', 
          method: 'POST'
        }, this.callback);

        deployStream.pipe(reqStream);
      },
      "should respond with app infomation": function (err, res, body) {
        assert.isNull(err);

        var result = JSON.parse(body).drone;
        assert.equal(result.user, 'test');
        assert.equal(result.name, 'hellonode');
        assert.isNumber(result.port);
        assert.isNumber(result.pid);
      },
      "the spawned application": {
        topic: function (req, body) {
          var result = JSON.parse(body);
          request('http://localhost:' + result.drone.port, this.callback)    
        },
        "should respond with 'hello, i know nodejitsu'": function (err, res, body) {
          assert.isNull(err);
          assert.equal(body.toLowerCase(), 'hello, i know nodejitsu.')
        },
        "when stopped": {
          topic: function () {
            request({
              url: 'http://localhost:9011/drones/hellonode/stop', 
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                stop: { name: 'hellonode' }
              })
            }, this.callback);
          },
          "should respond with 200": function (error, response, body) {
            assert.equal(response.statusCode, 200);
          }
        }
      }
    },
    "with a tar that generates an error": {
      topic: function () {
        var deployStream = fs.createReadStream(brokenTarball),
            reqStream;

        reqStream = request({
          url: 'http://localhost:9011/deploy/broken/hellonode', 
          method: 'POST'
        }, this.callback);

        deployStream.pipe(reqStream);
      },
      "responds with usage message": function (err, res, body) {
        var result = JSON.parse(body);
        assert.isString(result.error.usage);
      },
      "responds with 500": function (err, res, body) {
        assert.equal(res.statusCode, 500);
      }
    }
  }
}).export(module);

