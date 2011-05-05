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
    port = 9008,
    app = data.apps[0],
    server, client;

app.user = 'marak';

vows.describe('haibu/drone/api/client').addBatch(
  helpers.requireInit(function () {
    client = new haibu.drone.Client({
      host: ipAddress,
      port: port
    });

    server = haibu.drone.createServer({
      minUptime: 0,
      port: port,
      host: ipAddress,
      maxRestart: 1
    });
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
          assert.length(drones, 1);
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
  "when the tests are over": {
    topic: function () {
      return false;
    },
    "the server should clean up": function () {
      server.close();
    }
  }
}).export(module);
