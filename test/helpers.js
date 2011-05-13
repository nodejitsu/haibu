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

var printed_config_missing = false;
function print_config_error () {
  if ( !printed_config_missing ) {
    console.log("Config file config/auth.json doesn't have valid data." +
                " Skipping remote tests");
    printed_config_missing = true;
  }
}

// TODO (olauzon) load all /config/*.json at once in parallel
helpers.loadConfig = function () {

  var configFile = path.join(__dirname, '..', 'config', 'auth.json');

  try {
    var stats = fs.statSync(configFile),
        config = JSON.parse(fs.readFileSync(configFile).toString());

    if ((config.auth.username === 'test-username') ||
        (config.auth.apiKey === 'test-apiKey')) {
      return print_config_error();
    }

    testConfig = config;
    return config;

  }
  catch (ex) {
    return print_config_error();
  }
};

Object.defineProperty(helpers, 'loadAuth', {
  get: function() {
    if ( helpers.loadConfig() != null ) {
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
