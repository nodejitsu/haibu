
var path = require('path'),
    haibu = require('haibu');

var chroot = exports;

//
// Name this plugin so it can be accessed by name
//
chroot.name = 'chroot';

//
// ### function init (options, callback) 
// #### @options {Object} Options to initialize this plugin with
// #### @callback {function} Continuation to respond to when complete
// Initalizes the `chroot` plugin in the current `haibu` environment. 
//
chroot.init = function (options, callback) {
  options = options || {};
  callback = callback || function () { };
  
  var root = options.root || '/srv/chroot/lucid_amd64',
      source = options.source || '/usr/local/src', 
      relativeSource = path.join(root, source);
  
  //
  // Add the configuration necessary for chroot plugin
  //
  haibu.config.set('chroot', {
    enabled: true,
    root: root,
    source: source
  });

  haibu.config.set('directories:chroot', relativeSource);
  haibu.config.set('directories:apps', relativeSource);
  haibu.utils.initDirectories({ chroot: relativeSource }, callback);
};

//
// ### function spawnOptions (repo, host, port) 
// #### @repo {Repository} Code repository we are spawning from
// #### @host {string} Host that the application should listen on
// #### @port {string|number} Ports the application should listen on
// Returns the appropriate spawn options for the `haibu.Spawner` for 
// the `repo` along with extra `chroot` options. 
//
chroot.spawnOptions = function (repo, host, port) {
  var sourceDir = haibu.config.get('chroot:source'),
      chrootDir = haibu.config.get('directories:chroot'),
      chrootRoot = haibu.config.get('chroot:root'),
      relativeAppPath = path.join(sourceDir, repo.app.user, repo.app.name, repo.app.directories.home);
  
  return {
    carapace: path.join(chrootDir, 'carapace'),
    drone: [repo.app.scripts.start, host, port, chrootRoot, relativeAppPath]
  }
};

chroot.modules = ['daemon'];