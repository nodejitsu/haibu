/*
 * haibu.js: Top level include for the haibu module
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs'),
    events = require('events'),
    path = require('path'),
    EventEmitter2 = require('eventemitter2').EventEmitter2,
    dnode = require('dnode');

require.paths.unshift(__dirname);

var haibu = module.exports = new events.EventEmitter();

haibu.log           = require('cliff');
haibu.config        = require('haibu/core/config');
haibu.utils         = require('haibu/utils');
haibu.Spawner       = require('haibu/carapace/spawner').Spawner;
haibu.repository    = require('haibu/repositories');
haibu.drone         = require('haibu/drone');
haibu.initialized   = false;
haibu.plugins       = {};
haibu.activePlugins = {};

var socket = new EventEmitter2();
for(var k in socket) {
  var prop = socket[k];
  if(typeof prop === 'function') {
    socket[k] = socket[k].bind(socket);
  }
}
haibu.socket = socket;
var bridge = new dnode(socket);

//
// function init (options, callback)
// Initializes haibu directories and models
//
haibu.init = function (options, callback) {
  if (haibu.initialized) {
    return callback();
  }

  haibu.config.load(options, function (err) {
    haibu.utils.initDirectories(function initialized() {
      haibu.initialized = true;
      bridge.on('ready', function () {
        callback();
      });
      bridge.listen(path.join(__dirname,'..','running','master'));
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
