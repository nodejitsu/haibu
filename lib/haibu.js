/*
 * haibu.js: Top level include for the haibu module
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs'),
    events = require('events');

require.paths.unshift(__dirname);

var haibu = module.exports = new events.EventEmitter();

haibu.config        = require('haibu/core/config');
haibu.utils         = require('haibu/utils');
haibu.Spawner       = require('haibu/core/spawner').Spawner;
haibu.ProcessStore  = require('haibu/core/process-store').ProcessStore;
haibu.repository    = require('haibu/repositories');
haibu.drone         = require('haibu/drone');
haibu.balancer      = require('haibu/balancer');
haibu.initialized   = false;
haibu.plugins       = {};
haibu.activePlugins = {};

//
// function init (options, callback)
// Initializes haibu directories and models
//
haibu.init = function (options, callback) {
  if (haibu.initialized) {
    return callback();
  }

  haibu.config.load(options, function (err) {
    haibu.utils.initDirectories(function () {
      new haibu.ProcessStore().purge(function () {
        haibu.initialized = true;
        callback();
      });
    });
  });
};

//
// ### function use (plugin)
// #### @plugin {Object} Instance of a plugin from `haibu.plugins`
// Adds the specified `plugin` to the set of active plugins used by haibu.
//
haibu.use = function (plugin) {
  var args = Array.prototype.slice.call(arguments),
      callback = typeof args[args.length - 1] === 'function' && args.pop(),
      options = args.length > 1 && args.pop();
  
  haibu.activePlugins[plugin.name] = plugin;
  plugin.init(options, callback);
};

//
// Define each of our plugins as a lazy loaded `require` statement
//
fs.readdirSync(__dirname + '/haibu/plugins').forEach(function (plugin) {
  plugin = plugin.replace('.js', '');
  haibu.plugins.__defineGetter__(plugin, function () {
    return require('./haibu/plugins/' + plugin);
  });
});
