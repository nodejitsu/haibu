
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
  //Hide potentially critical env vars
  //
  var hideEnv = haibu.config.get('hideEnv') || {};
  hideEnv.SSH_CONNECTION = true;
  hideEnv.SSH_CLIENT = true;
  hideEnv.USER = true;
  hideEnv.MAIL = true;
  hideEnv.PWD = true;
  hideEnv.SHLVL = true;
  hideEnv.HOME = true;
  hideEnv.LOGNAME = true;
  hideEnv.SSH_CONNECTION = true;
  hideEnv.OLDPWD = true;
  hideEnv.DISPLAY = true;
  hideEnv.COLORTERM = true;
  hideEnv.XAUTHORITY = true;
  hideEnv.SHELL = true;
  hideEnv.USERNAME = true;
  hideEnv.SUDO_COMMAND = true;
  hideEnv.SUDO_USER = true;
  hideEnv.SUDO_UID = true;
  hideEnv.SUDO_GID = true;
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
