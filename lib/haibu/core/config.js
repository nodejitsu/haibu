/*
 * config.js: Top level module include for config module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs'),
    path = require('path'),
    nconf = require('nconf'),
    haibu = require('../../haibu');

//
// Require `nconf-redis` so that we can expose
// `nconf.stores.Redis` in `haibu`.
//
require('nconf-redis');

var root   = path.join(__dirname, '..', '..', '..'),
    config = module.exports = nconf;

//
// ### function (options)
// #### @options {Object} Options to setup for flexibility
// Sets up configuration options with default options for
// maximum flexibility in usage.
//
function setupOptions (options) {
  options                  = options                  || {};
  options.env              = options.env              || 'development';
  options.data             = options.data             || {};
  options.config           = options.config           || {};
  options.config.files     = options.config.files     || [];
  options.config.namespace = options.config.namespace || options.env;
  return options;
}

//
// ### Expose the simple routes for the haibu config API.
//
config.addRoutes = function () {
  return function (map) {
    map.post(/\/reload/).bind(function (response, data) {
      //
      // **TODO: _(indexzero)_**: Ensure this request is authenticated.
      //

      data = data.config ? data : haibu.config.get('config');
      haibu.config.load(data, function (err) {
        if (err) {
          return response.send(500, {}, { error: err.message });
        }

        response.send(200);
      });
    });
  };
};

//
// ### function seed (options, callback)
// #### @options {Object} Options for nconf store.
// #### @callback {function} Continuation to respond to when complete.
// Seeds any existing data from `options.files` into a Redis store
// for distributed use.
//
config.seed = function (options, callback) {
  if (!callback) {
    callback = options;
    options  = {};
  }

  //
  // Setup `options` to be _really_ flexible.
  //
  options   = setupOptions(options);
  var store = new nconf.stores.Redis(options.config), keys;

  config.loadFiles(options.config.files, function (err, loaded) {
    if (err) {
      return callback(err);
    }

    function storeValue(key, next) {
      store.set(key, options.data[key], next);
    }

    Object.keys(loaded).forEach(function (key) {
      options.data[key] = loaded[key];
    });

    var keys = Object.keys(options.data);
    async.forEach(keys, storeValue, function (err) {
      if (err) {
        return callback(err);
      }

      store.set('loaded', true, function (err) {
        store.redis.quit();
        return err ? callback(err) : callback();
      });
    });
  });
};

config.set('allowedExecutables', ['node', 'coffee']);

config.set('directories', {
  apps: path.join(root, 'local'),
  autostart: path.join(root, 'autostart'),
  packages: path.join(root, 'packages'),
  tmp: path.join(root, 'tmp')
});
