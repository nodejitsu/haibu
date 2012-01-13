/*
 * haibu.js: Top level include for the haibu module
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs'),
    path = require('path'),
    flatiron = require('flatiron'),
    semver = require('semver');

var haibu = module.exports = new flatiron.App({
  delimiter: ':',
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
haibu.on('init', function () {
  haibu.engineDir  = haibu.config.get('directories:node-installs');
  haibu.nodeVersions = haibu.engineDir && fs.readdirSync(haibu.engineDir);
});

haibu.sendResponse = function sendResponse(res, status, body) {
  return res.json(status, body);
}

haibu.getSpawnOptions = function getSpawnOptions (app) {
  var env = app.env, 
      command = 'node',
      nodeDir,
      version,
      engine,
      cwd;
      
  if (haibu.nodeVersions) {
    engine = (app.engines || app.engine || {node: app.engine}).node;
    if (typeof engine !== 'string') {
      engine = null;
    }
    version = semver.maxSatisfying(haibu.nodeVersions, engine);
    if (!version) {
      var err = new Error('Error spawning drone: no matching engine found');
      err.blame = {
        type: 'user',
        message: 'Repository configuration'
      }
      throw err;
    }
    nodeDir = path.join(haibu.engineDir, version);
  }

  var options = {};
  if (version) {
    //
    // Add node (should be configured with --no-npm) and -g modules to path of repo
    //
    if (semver.lt(version, '0.6.5')) {
      options.forkShim = true;
    }
    if (env) {
      env.NODE_VERSION = 'v'+version;
      env.NODE_PREFIX = nodeDir;
      env.NODE_PATH = path.join(nodeDir, 'lib', 'node_modules');
      var concatPATH = (process.env.PATH ? ':' + process.env.PATH : '');
      env.PATH = path.join(nodeDir, 'bin') + ':' + path.join(nodeDir, 'node_modules') + concatPATH;
      var concatCPATH = (process.env.CPATH ? ':' + process.env.CPATH : '');
      env.CPATH = path.join(nodeDir, 'include') + ':' + path.join(nodeDir, 'include', 'node') + concatCPATH;
      var concatLIBRARY_PATH = (process.env.LIBRARY_PATH ? ':' + process.env.LIBRARY_PATH : '');
      env.LIBRARY_PATH = path.join(nodeDir, 'lib') + ':' + path.join(nodeDir, 'lib', 'node') + concatLIBRARY_PATH;
    }
    
    options.cwd = nodeDir;
    command = path.join(nodeDir, 'bin', 'node');
  }

  options.env = env;
  options.command = command;
  
  return options;
}

//
// Expose the `chroot` plugin as a lazy-loaded getter
//
haibu.__defineGetter__('chroot', function () {
  return require('./haibu/plugins/chroot');
});
haibu.__defineGetter__('coffee', function () {
  return require('./haibu/plugins/coffee');
});
haibu.__defineGetter__('advanced-replies', function () {
  return require('./haibu/plugins/advanced-replies');
});
