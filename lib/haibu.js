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

haibu.config     = require('./haibu/core/config');
haibu.utils      = require('./haibu/utils');
haibu.Spawner    = require('./haibu/core/spawner').Spawner;
haibu.repository = require('./haibu/repositories');
haibu.drone      = require('./haibu/drone');
haibu.deploy     = require('./haibu/core/deploy');
haibu.running    = {};