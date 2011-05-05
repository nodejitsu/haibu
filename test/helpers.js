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

// TODO (olauzon) load all /config/*.json at once in parallel
helpers.loadConfig = function () {

  var configFile = path.join(__dirname, '..', 'config', 'auth.json');

  try {
    var stats = fs.statSync(configFile),
        config = JSON.parse(fs.readFileSync(configFile).toString());

    if ((config.auth.username === 'test-username') ||
        (config.auth.apiKey === 'test-apiKey')) {
      util.puts('Config file config/auth.json must be updated ' +
                'with valid data before running tests.');
      process.exit(0);
    }

    testConfig = config;
    return config;

  }
  catch (ex) {
    util.puts('Config file config/auth.json ' +
              'must be created with valid data before running tests.');
    process.exit(0);
  }
};

Object.defineProperty(helpers, 'loadAuth', {
  get: function() {
    return helpers.loadConfig().auth;
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
