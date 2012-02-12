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

haibu.config.set('authToken', 'haibu');
var auth = {
      'X-Auth-Token': 'haibu'
    },
    noAuth = {
      'X-Auth-Token': 'not-haibu'
    };

vows.describe('haibu/drone/api').addBatch(
  helpers.requireStart(port, function (_server) {
    server = _server;
  })
).addBatch({
  "When using the drone server": {
    "with incorrect auth token": {
      "a request against /": helpers.requireResponse('/', noAuth, 403),
      "a request against /version": helpers.requireResponse(
          '/version',
          noAuth,
          403
      )
    },
    "with correct auth token": {
      "a request against /": helpers.requireResponse('/', auth, 400),
      "a request against /version": helpers.requireResponse(
          '/version',
          auth,
          200
      )
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
