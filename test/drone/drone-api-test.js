/*
 * drone-api-test.js: Tests for the `drone` module's RESTful API.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    exec = require('child_process').exec,
    fs = require('fs'),
    path = require('path'),
    eyes = require('eyes'),
    request = require('request'),
    vows = require('vows'),
    helpers = require('../helpers'),
    data = require('../fixtures/apps'),
    haibu = require('../../lib/haibu');

var ipAddress = '127.0.0.1',
    port = 9000,
    app = data.apps[0],
    server;

app.user = 'marak';

vows.describe('haibu/drone/api').addBatch(
  helpers.requireStart(port, function (_server) {
    server = _server;
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
      },
      "a request against the application": helpers.assertTestApp()
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
          assert.lengthOf(drones, 1);
        }
      }
    }
  }
}).addBatch({
  "When using the drone server": {
    "a request against /drones/:id/update": {
      "when there are running drones": {
        topic: function () {
          var options = {
            uri: 'http://localhost:9000/drones/test/update',
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
          assert.isObject(drones);
          assert.lengthOf(drones['test'].drones, 1);
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
        },
        "should respond with the appropriate error": function (error, response, body) {
          var result = JSON.parse(body);
          assert.isObject(result.error);
          assert.equal(result.error.message, 'Cannot restart application that is not running.');
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
        },
        "should respond with the appropriate error": function (error, response, body) {
          var result = JSON.parse(body);
          assert.isObject(result.error);
          assert.equal(result.error.message, 'Cannot stop application that is not running.');
        }
      }
    }
  }
}).addBatch({
  "When using the drone server": {
    "a request against /drones/:id/start": {
      "for an application with errors": {
        topic: function () {
          var sourceDir = path.join(__dirname, '..', 'fixtures', 'repositories', 'bad-start'),
              pkgJson = fs.readFileSync(path.join(sourceDir, 'package.json')),
              npmApp = JSON.parse(pkgJson),
              options;

          npmApp.user = 'charlie';
          npmApp.repository.directory = sourceDir;
          
          options = {
            uri: 'http://localhost:9000/drones/bad-start/start',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              start: npmApp
            })
          };

          request(options, this.callback);
        },
        "should respond with 500": function (error, response, body) {
          assert.equal(response.statusCode, 500);
        },
        "should respond with the appropriate error": function (error, response, body) {
          var result = JSON.parse(body);
          assert.equal(result.error.message, 'Error spawning drone');
          
          //
          // Assert that the correct error message from the drone was passed 
          // back up the callback chain.
          //
          var errLine = result.error.stderr.split('\n').filter(function (line) {
            return line.indexOf("Cannot find module 'badmodule'") > -1;
          })[0];
          assert.isString(errLine);
        }
      }
    }
  }
}).addBatch({
  "When using the drone server": {
    "a request against /drones/cleanall": {
      topic: function () {
        var options = {
          uri: 'http://localhost:9000/drones/cleanall',
          method: 'POST'
        };

        request(options, this.callback);
      },
      "should respond with 200": function (error, response, body) {
        assert.equal(response.statusCode, 200);
      },
      "should remove the files from the app dir": function (err, response, body) {
        assert.isTrue(!err);
        var files = fs.readdirSync(haibu.config.get('directories:apps'));
        assert.lengthOf(files, 0);
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
