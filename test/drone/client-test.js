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
    port = 9008,
    app = data.apps[0],
    server, client;

app.user = 'marak';

vows.describe('haibu/drone/api/client').addBatch(
  helpers.requireStart(port, function (_server) {
    client = new haibu.drone.Client({
      host: ipAddress,
      port: port
    });

    server = _server;
  })
).addBatch({
  "When using the drone client": {
    "the start() method": {
      topic: function () {
        client.start(app, this.callback);
      },
      "should respond with the drone that was started": function (err, result) {
        assert.isNull(err);
        assert.isNotNull(result.drone);
        assert.include(result.drone, 'pid');
        assert.include(result.drone, 'port');
        assert.include(result.drone, 'host');
      }
    }
  }
}).addBatch({
  "When using the drone client": {
    "the restart() method": {
      "when there are running drones": {
        topic: function () {
          client.restart(app.name, this.callback);
        },
        "should respond with a list of drones": function (err, drones) {
          assert.isNull(err);
          assert.isArray(drones);
          assert.lengthOf(drones, 1);
        }
      }
    }
  }
}).addBatch({
  "When using the drone client": {
    "the stop() method": {
      "when there are running drones": {
        topic: function () {
          client.stop(app.name, this.callback);
        },
        "should respond without an error": function (err) {
          assert.isNull(err);
        }
      }
    }
  }
}).addBatch({
  "When using the drone client": {
    "the clean() method": {
      topic: function () {
        client.clean(app, this.callback.bind(null, null));
      },
      "should remove the files from the app dir": function (err) {
        assert.isNull(err);
        try {
          fs.readdirSync(path.join(haibu.config.get('directories:apps'), app.user, app.name));
          assert.isTrue(false);
        }
        catch (ex) {
          assert.equal(ex.code, 'ENOENT');
        }
      }
    }
  }
}).addBatch({
  "When using the drone client": {
    "the restart() method": {
      "when there are are no running drones": {
        topic: function () {
          client.restart(app.name, this.callback.bind(null, null));
        },
        "should respond with an error": function (ign, err) {
          assert.isNotNull(err);
        }
      }
    }
  }
}).addBatch({
  "When using the drone client": {
    "the stop() method": {
      "when there are no running drones": {
        topic: function () {
          client.stop(app.name, this.callback.bind(null, null));
        },
        "should respond with an error": function (ign, err) {
          assert.isNotNull(err);
        }
      }
    }
  }
}).addBatch({
  "When using the drone client": {
    "the cleanAll() method": {
      topic: function () {
        client.cleanAll(this.callback);
      },
      "should remove the files from the app dir": function (err) {
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
