/*
 * drone-api-test.js: Tests for the `drone` module's RESTful API.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

require.paths.unshift(require('path').join(__dirname, '..', '..', 'lib'));
require.paths.unshift(require('path').join(__dirname, '..'));

var vows = require('vows'),
    helpers = require('../helpers'),
    path = require('path'),
    fs = require('fs'),
    eyes = require('eyes'),
    assert = require('assert'),
    request = require('request'),
    data = require('fixtures/apps'),
    exec = require('child_process').exec,
    haibu = require('haibu');

var ipAddress = '127.0.0.1',
    port = 9000,
    app = data.apps[0],
    server;

app.user = 'marak';

vows.describe('haibu/drone/api').addBatch(
  helpers.requireInit(function () {
    server = haibu.drone.createServer({
      minUptime: 0,
      port: port,
      host: ipAddress,
      maxRestart: 1
    });
  })
).addBatch({
  "When using the drone server": {
    "a request against /": {
      topic: function () {
        var options = {
          uri: 'http://localhost:9000/'
        };

        request(options, this.callback);
      },
      "should respond with 400": function (error, response, body) {
        assert.equal(response.statusCode, 400);
      }
    },
    "a request against /version": {
      topic: function () {
        var options = {
          uri: 'http://localhost:9000/version/'
        };

        request(options, this.callback);
      },
      "should respond with 200": function (error, response, body) {
        assert.equal(response.statusCode, 200);
      }
    },
    "a request against /drones/:id/start": {

      topic: function () {

        var options = {
          uri: 'http://localhost:9000/drones/test/start',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            start : app
          })
        };

        request(options, this.callback);
      },
      "should respond with 200": function (error, response, body) {
        var result = JSON.parse(body);
        assert.equal(response.statusCode, 200);
        assert.isNotNull(result.drone);
        assert.include(result.drone, 'pid');
        assert.include(result.drone, 'port');
        assert.include(result.drone, 'host');
      }
    }
  }
}).addBatch({
  "When using the drone server": {
    "a request against /drones/:id/restart": {
      "when there are running drones": {
        topic: function () {
          var options = {
            uri: 'http://localhost:9000/drones/test/restart',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              restart : { name: app.name }
            })
          };

          request(options, this.callback);
        },
        "should respond with 200": function (error, response, body) {
          assert.equal(response.statusCode, 200);
        },
        "should respond with a list of drones": function (error, response, body) {
          var drones = JSON.parse(body).drones;
          assert.isArray(drones);
          assert.length(drones, 1);
        }
      }
    }
  }
}).addBatch({
  "When using the drone server": {
    "a request against /drones": {
      "when there are running drones": {
        topic: function () {
          var options = {
            uri: 'http://localhost:9000/drones',
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          };
          request(options, this.callback);
        },
        "should respond with 200": function (error, response, body) {
          assert.equal(response.statusCode, 200);
        },
        "should respond with a list of drones": function (error, response, body) {
          var drones = JSON.parse(body).drones;
          assert.isArray(drones);
          assert.length(drones, 1);
        }
      }
    }
  }
}).addBatch({
  "When using the drone server": {
    "a request against /drones/:id": {
      "when there are running drones": {
        topic: function () {
          var options = {
            uri: 'http://localhost:9000/drones/test',
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          };
          request(options, this.callback);
        },
        "should respond with 200": function (error, response, body) {
          assert.equal(response.statusCode, 200);
        },
        "should respond with a drone": function (error, response, body) {
          var drone = JSON.parse(body);
          assert.isObject(drone);
        }
      }
    }
  }
}).addBatch({
  "When using the drone server": {
    "a request against /drones/:id/stop": {
      "when there is are running drones": {
        topic: function () {
          var options = {
            uri: 'http://localhost:9000/drones/test/stop',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              stop : { name: app.name }
            })
          };

          request(options, this.callback);
        },
        "should respond with 200": function (error, response, body) {
          assert.equal(response.statusCode, 200);
        }
      }
    }
  }
}).addBatch({
  "When using the drone server": {
    "a request against /drones/:id/clean": {
      topic: function () {
        var options = {
          uri: 'http://localhost:9000/drones/test/clean',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(app)
        };

        request(options, this.callback);
      },
      "should respond with 200": function (error, response, body) {
        assert.equal(response.statusCode, 200);
      },
      "should remove the files from the app dir": function (err, response, body) {
        try {
          fs.readdir(path.join(haibu.config.directories.apps, app.user, app.name));
          assert.isTrue(false);
        }
        catch (ex) {
          assert.isTrue(true);
        }
      }
    }
  }
}).addBatch({
  "When using the drone server": {
    "a request against /drones/:id/restart": {
      "when there are are no running drones": {
        topic: function () {
          var options = {
            uri: 'http://localhost:9000/drones/test/restart',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              restart : { name: app.name }
            })
          };

          request(options, this.callback);
        },
        "should respond with 500": function (error, response, body) {
          assert.equal(response.statusCode, 500);
        }
      }
    }
  }
}).addBatch({
  "When using the drone server": {
    "a request against /drones/:id/stop": {
      "when there are no running drones": {
        topic: function () {
          var options = {
            uri: 'http://localhost:9000/drones/test/stop',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              stop : { name: app.name }
            })
          };

          request(options, this.callback);
        },
        "should respond with 500": function (error, response, body) {
          assert.equal(response.statusCode, 500);
        }
      }
    }
  }
}).addBatch({
  "when the tests are over": {
    topic: function () {
      return false;
    },
    "the server should clean up": function () {
      server.close();
    }
  }
}).export(module);
