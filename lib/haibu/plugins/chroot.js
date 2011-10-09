
var path = require('path'),
    exec = require('child_process').exec,
    haibu = require('../../haibu');

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

  //
  // Hide potentially critical env vars
  //
  var hideEnv = haibu.config.get('hideEnv') || [];

  hideEnv = hideEnv.concat([
    'COLORTERM',
    'DISPLAY',
    'HOME',
    'LOGNAME',
    'MAIL',
    'OLDPWD',
    'PWD',
    'SHELL',
    'SHLVL',
    'SSH_CLIENT',
    'SSH_CONNECTION',
    'SUDO_COMMAND',
    'SUDO_GID',
    'SUDO_USER',
    'SUDO_UID',
    'USER',
    'USERNAME',
    'XAUTHORITY'
  ]);

  haibu.config.set('hideEnv', hideEnv);
  haibu.config.set('directories:apps', relativeSource);

  haibu.utils.initDirectories({ chroot: relativeSource }, callback);
};

//
// ### function argv (repo)
// #### @repo {Repository} Code repository we are spawning from
// Returns the appropriate spawn options for the `haibu.Spawner` for
// the `repo` along with extra `chroot` options.
//
chroot.argv = function (repo) {
  //
  // e.g. /usr/local/src within the chroot.
  //
  var root = haibu.config.get('chroot:root'),
      sourceDir = haibu.config.get('chroot:source');

  return {
    script: repo.startScript.replace(root, ''),
    argv: [
      '--plugin',
      'chroot',
      '--chroot',
      haibu.config.get('chroot:root'),
      '--plugin',
      'chdir',
      '--chdir',
      repo.homeDir.replace(root, '')
    ]
  };
};
