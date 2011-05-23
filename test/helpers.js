/*
 * helpers.js: Test helpers for haibu
 *
 * (C) 2011 Nodejitsu Inc.
 * MIT LICENSE
 *
 */

require.paths.unshift(require('path').join(__dirname, '..', 'lib'));

var util = require('util'),
    assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    haibu = require('haibu');

var testConfig, helpers = exports;

var configMissing = false;

function showConfigError () {
  if (!configMissing) {
    console.log("Config file config/auth.json doesn't have valid data. Skipping remote tests");
    configMissing = true;
  }
}

helpers.loadConfig = function () {
  //
  // TODO (olauzon) load all /config/*.json at once in parallel
  //
  var configFile = path.join(__dirname, '..', 'config', 'auth.json');

  try {
    var stats = fs.statSync(configFile),
        config = JSON.parse(fs.readFileSync(configFile).toString());

    if ((config.auth.username === 'test-username') ||
        (config.auth.apiKey === 'test-apiKey')) {
      return showConfigError();
    }

    testConfig = config;
    return config;
  }
  catch (ex) {
    return showConfigError();
  }
};

Object.defineProperty(helpers, 'auth', {
  get: function() {
    if (helpers.loadConfig() !== null) {
      return helpers.loadConfig().auth;
    }
  }
});

helpers.requireInit = function (initialized) {
  return {
    "This test requires haibu.init": {
      topic: function () {
        var that = this;

        haibu.init({ env: 'development' }, function (err) {
          haibu.use(haibu.plugins.logger, {
            loggly: haibu.config.get('loggly'),
            console: {
              level: 'silly',
              silent: true
            }
          });
          
          return err ? that.callback(err) : that.callback();
        });
      },
      "should respond with no error": function (err) {
        assert.isTrue(typeof err === 'undefined');
        if (initialized) {
          initialized();
        }
      }
    }
  };
};
