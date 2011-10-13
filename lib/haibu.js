/*
 * haibu.js: Top level include for the haibu module
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs'),
    events = require('little-big-events'),
    path = require('path'),
    hookio = require('hook.io');

function tryLoadCacheSync () {
  cachePath = path.join(__dirname, '..', 'config', 'cache.json');
  try {
    return JSON.parse(fs.readFileSync(cachePath))    
  } catch (err) {
    return {}
  }
}

var _config = tryLoadCacheSync ();

_config.type = 'redis'
//this will emit all haibu events to redis, 
//and also opens the door to listening to events in other parts of the stack.

var haibu = module.exports = new events.EventEmitter(_config);

//
// Expose version through `pkginfo`.
//
require('pkginfo')(module, 'version');

haibu.log           = require('cliff');
haibu.config        = require('./haibu/core/config');
haibu.utils         = require('./haibu/utils');
haibu.Spawner       = require('./haibu/core/spawner').Spawner;
haibu.repository    = require('./haibu/repositories');
haibu.balancer      = require('./haibu/balancer');
haibu.drone         = require('./haibu/drone');
haibu.deploy        = require('./haibu/core/deploy');
haibu.initialized   = false;
haibu.running       = {};
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
    if (err) {
      return callback(err);
    }

    haibu.utils.initDirectories(function initialized() {
      haibu.initialized = true;
      callback();
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

  if (!callback) {
    callback = function () {};
  }

  if (haibu.activePlugins[plugin.name]) {
    return callback();
  }

  haibu.activePlugins[plugin.name] = plugin;

  return plugin.init
    ? plugin.init(options, callback)
    : callback();
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
