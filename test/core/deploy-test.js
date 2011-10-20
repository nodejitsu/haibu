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
    sys = require('sys'),
    vows = require('vows'),
    request = require('request'),
    it = require('it-is'),
    helpers = require('../helpers'),
    haibu = require('../../lib/haibu');

var fixtureDir = path.join(__dirname, '..', 'fixtures'),
    helloTarball = path.join(fixtureDir , 'repositories', 'streaming', 'hn.tar.gz'),
    brokenTarball = path.join(fixtureDir , 'repositories', 'streaming', 'broken.tar'),
    appPort;
  
vows.describe('haibu/deploy').addBatch(helpers.requireStart(9011)).addBatch({
  "Before testing streaming deploys": {
    topic: function () { 
      request({ url: 'http://localhost:9011/drones/info' },  this.callback)    
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
          url: 'http://localhost:9011/drones/deploy/test/hellonode', 
          method:'PUT'
        }, this.callback);

        deployStream.pipe(reqStream)
      },
      "should respond with app infomation": function (err, res, body) {
        assert.isNull(err);

        var result = JSON.parse(body);
        it(result).has({
          user: 'test',
          name: 'hellonode',
          app: {
            name: 'hellonode'
          },
          drone: {
            port: it.isNumber(),
            pid: it.isNumber()
          }
        });
      },
      "the spawned application": {
        topic: function (res, body) {
          var app = JSON.parse(body);
          request('http://localhost:' + app.port, this.callback)    
        },
        "should respond with 'hello, i know nodejitsu'": function (err, res, body) {
          assert.isNull(err);
          assert.equal(body.toLowerCase(), 'hello, i know nodejitsu.')
        }
      }
    },
    "with a tar that generates an error": {
      topic: function () {
        var deployStream = fs.createReadStream(brokenTarball),
            reqStream;

        reqStream = request({
          url: 'http://localhost:9011/drones/deploy/test/hellonode', 
          method:'PUT'
        }, this.callback);

        deployStream.pipe(reqStream);
      },
      'responds with usage message': function (err, res, body) {
        var usage = JSON.parse(body);
        it(usage).has({
          usage: it.isString()
        });
      },
      'responds with 400 (bad request)': function (err, res, body) {
        it(res).has({
          statusCode: 400
        });
      }
    }
  }
}).export(module);
