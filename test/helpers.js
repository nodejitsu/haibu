/*
 * helpers.js: Test helpers for haibu
 *
 * (C) 2011 Nodejitsu Inc.
 * MIT LICENSE
 *
 */

var assert = require('assert'),
    exec = require('child_process').exec,
    fs = require('fs'),
    path = require('path'),
    util = require('util'),
    request = require('request'),
    winston = require('winston'),
    haibu = require('../lib/haibu');

require('winston-loggly');

var helpers = exports,
    testConfig;

function showConfigWarning (requireAuth) {
  if ((!testConfig || !testConfig.auth || 
      testConfig.auth.username === 'test-username' ||
      testConfig.auth.apiKey === 'test-apiKey') 
      && requireAuth) {
    console.warn("Config file test/fixtures/test-config.json doesn't have valid data. Skipping remote tests");
  }
}

helpers.loadConfig = function (requireAuth) {
  function showConfig () {
    showConfigWarning(requireAuth);
    return testConfig;
  }
  
  if (testConfig) {
    return showConfig();
  }
  
  try {
    var configFile = path.join(__dirname, 'fixtures', 'test-config.json'),
        config = JSON.parse(fs.readFileSync(configFile).toString());

    testConfig = config;
    return showConfig();
  }
  catch (ex) {
    console.warn('Error parsing test-config.json: ' + ex.message);
    return showConfig();
  }
};

helpers.cleanAutostart = function (callback) {
  exec('rm -rf autostart/*', callback);
};

helpers.init = function (callback) {
  var config = helpers.loadConfig() || {};
  helpers.cleanAutostart(function () {
    if (config) {
      Object.keys(config).forEach(function (key) {
        haibu.config.set(key, config[key]);
      });
    }
    
    haibu.init(callback);
  });
};

helpers.start = function (port, callback) {
  helpers.init(function (err) {
    haibu.drone.start({
      minUptime: 0,
      port: port,
      maxRestart: 2,
      init: false
    }, function (err, server) {
      return callback(err, server);
    });
  });
};

helpers.requireInit = function (initialized) {
  return {
    "This test requires haibu.init": {
      topic: function () {
        helpers.init(this.callback);
      },
      "should respond with no error": function (err) {
        assert.isTrue(!err);
        if (initialized) {
          initialized();
        }
      }
    }
  };
};

helpers.requireStart = function (port, started) {
  return {
    "This test requires haibu.drone.start": {
      topic: function () {
        helpers.start(port, this.callback);
      },
      "should respond with no error": function (err, server) {
        assert.isTrue(!err);
        if (started) {
          started(server);
        }
      }
    }
  };
};

helpers.assertApp = function (message, assertFn) {
  var context = {
    topic: function (res, body) {
      var result = JSON.parse(body);
      request({ 
        uri: 'http://' + result.drone.host + ':' + result.drone.port
      }, this.callback);
    }
  };
  
  context[message] = assertFn;
  return context
}

helpers.assertTestApp = function () {
  return helpers.assertApp("should respond with 'hello, i know nodejitsu.'", function (err, res, body) {
    assert.equal(body, 'hello, i know nodejitsu.');
  });
};

helpers.requireResponse = function(url, headers, code) {
  var vow = {
    topic: function () {
      var options = {
        uri: 'http://localhost:9000' + url,
        headers: headers,
      };

      request(options, this.callback);
    }
  };

  vow['should respond with ' + code] = function (error, response, body) {
    assert.equal(response.statusCode, code);
  };

  return vow;
};
