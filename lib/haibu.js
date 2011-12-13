/*
 * haibu.js: Top level include for the haibu module
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs'),
    path = require('path'),
    flatiron = require('flatiron');

var haibu = module.exports = new flatiron.App({
  root: path.join(__dirname, '..'),
  directories: {
    apps: '#ROOT/local',
    autostart: '#ROOT/autostart',
    config: '#ROOT/config',
    packages: '#ROOT/packages',
    tmp: '#ROOT/tmp'
  }
});

//
// Expose version through `pkginfo`.
//
require('pkginfo')(module, 'version');

//
// Set the allowed executables
//
haibu.config.set('allowedExecutables', ['node', 'coffee']);

haibu.common     = haibu.utils = require('./haibu/common');
haibu.Spawner    = require('./haibu/core/spawner').Spawner;
haibu.repository = require('./haibu/repositories');
haibu.drone      = require('./haibu/drone');
haibu.running    = {};

haibu.sendResponse = function sendResponse(res, status, body) {
  return res.json(status, body);
}

//
// Expose the `chroot` plugin as a lazy-loaded getter
//
haibu.__defineGetter__('chroot', function () {
  return require('./haibu/plugins/chroot');
});
haibu.__defineGetter__('advanced-replies', function () {
  return require('./haibu/plugins/advanced-replies');
});


