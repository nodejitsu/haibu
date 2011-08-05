/*
 * config-test.js: Tests for the config module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var vows = require('vows'),
    helpers = require('../helpers'),
    assert = require('assert'),
    eyes = require('eyes'),
    nconf = require('nconf'),
    request = require('request'),
    haibu = require('../../lib/haibu');

var ipAddress = '127.0.0.1',
    port = 9020, server, store;

vows.describe('haibu/config/api').addBatch(
  helpers.requireInit(function () {
    server = haibu.drone.createServer({
      port: port,
      host: ipAddress,
      maxRestart: 1
    });
  })
).addBatch({
  "When using the Nodejitsu config module": {
    "when new config exists in the remote Redis server": {
      topic: function () {
        store = new nconf.stores.Redis({ namespace: 'development' });
        store.set('test:foo', true, this.callback);
      },
      "a request to /config/reload": {
        "when authorized": {
          topic: function () {
            var options = {
              uri: 'http://localhost:9020/config/reload',
              method: 'POST',
              headers: {
               'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                config: {
                  host: '127.0.0.1'
                }
              })
            };

            request(options, this.callback);
          },
          "should respond with 200": function (err, res, body) {
            assert.isNull(err);
            assert.equal(res.statusCode, 200);
          },
          "should reload the configuration correctly": function (err, res, body) {
            assert.isNull(err);
            assert.equal(haibu.config.get('test:foo'), true);
          }
        }
      }
    }
  }
}).export(module);
