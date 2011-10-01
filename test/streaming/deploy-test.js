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
    helpers = require('../helpers'),
    haibu = require('../../lib/haibu'),
    request = require('request'),
    fixtureDir = path.join(__dirname, '..', 'fixtures')
    helloTarball = path.join(fixtureDir , 'repositories', 'streaming', 'hn.tar.gz'),
    brokenTarball = path.join(fixtureDir , 'repositories', 'streaming', 'broken.tar'), //this one is not in gzip format
    u = require('ubelt'),
//    es = require('event-stream'),
    it = require('it-is')
    ;

var appPort
  
vows.describe('haibu/deploy')
.addBatch(helpers.requireStart(9011))
.addBatch({
  'begin with no apps': {
    topic: function () { 
      request({url: 'http://localhost:9011/info'},  this.callback)    
    },
    'no apps running' : function (err, res, body) {
      var apps = JSON.parse(body)
  
      assert.deepEqual(apps, [])
    }
  }
})
.addBatch({
  'deploy in a single PUT': {
    topic: function () {
      var that = this
      var deployStream = fs.createReadStream(helloTarball)
      var reqStream = request({url: 'http://localhost:9011/deploy/test/hellonode', method:'PUT'}
        , function (err, res, body) {
        try { appPort = JSON.parse(body).port } catch (err) {console.error(err)} //just assign this stuff, it's tested next.
        that.callback(err, res, body)
      })
      deployStream.pipe(reqStream)
    },
    'responds with app infomation': function (err, res, body) {
      var result = JSON.parse(body)
      assert.isNull(err);
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
      })
    },
    'app responds on correct port': {
      topic: function () {
        request('http://localhost:'+appPort, this.callback)    
      },
      'hello, i know nodejitsu': function (err, res, body) {
        assert.equal(body.toLowerCase(), 'hello, i know nodejitsu.')
      }
    }
  }
})
.addBatch({
  'PUT deploy with wrong format': {
    topic: function () {
      var that = this
      var deployStream = fs.createReadStream(brokenTarball)
      var reqStream = request({url: 'http://localhost:9011/deploy/test/hellonode', method:'PUT'}
        , function (err, res, body) {
        try { appPort = JSON.parse(body).port } catch (err) {console.error(err)} //just assign this stuff, it's tested next.
        that.callback(err, res, body)
      })
      deployStream.pipe(reqStream)
    },
    'responds with usage message': function (err, res, body) {
      var usage = JSON.parse(body)
      it(usage).has({
        usage: it.isString()
      })      
    },
    'responds with 400 (bad request)': function (err, res, body) {
      it(res).has({
        statusCode: 400 //bad request
      })
    }
  }
}).export(module)
