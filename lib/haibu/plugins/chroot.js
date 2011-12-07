
var path = require('path'),
    exec = require('child_process').exec,
    spawn = require('child_process').spawn,
    haibu = require('../../haibu');

var chroot = exports;

//
// Name this plugin so it can be accessed by name
//
chroot.name = 'chroot';

//
// ### function attach (options, callback)
// #### @options {Object} Options to initialize this plugin with
// #### @callback {function} Continuation to respond to when complete
// Initalizes the `chroot` plugin in the current `haibu` environment.
//
chroot.attach = function (options) {
  options = options || {};

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
};

chroot.init = function (done) {
  var relativeSource = haibu.config.get('directories:apps');
  haibu.common.directories.create({ chroot: relativeSource }, done);
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

haibu.common.npm.install = function (dir, target, callback) {
  var chrootDir = haibu.config.get('chroot').root,
      appDir = dir;
      
  if (appDir.indexOf(chrootDir) === 0) {
    appDir = appDir.substr(chrootDir.length);
  }
  
  haibu.common.npm.loadDependencies(target, function (err, dependencies) {
    if (err) {
      return callback(err);
    }
    
    var chroot, meta = {
      app: target.name,
      dependencies: dependencies
    };
    
    haibu.emit('npm:install:start', 'info', meta);
    chroot = spawn('node', [path.join(__dirname, '..', 'common', 'chroot-npm-install.js'), chrootDir, appDir]);
    
    chroot.stdout.on('data', function (data) {
      haibu.emit('npm:install:stdout', 'info', {
        data: data+'',
        meta: meta
      });
    });
    
    chroot.stderr.on('data', function (data) {
      haibu.emit('npm:install:stderr', 'info', {
        data: data+'',
        meta: meta
      });
    });
    
    chroot.on('exit', function (code) {
      if (code) {
        var err = new Error('NPM Install failed');
        err.code = code;
        haibu.emit('npm:install:failure', 'info', {
          code: code,
          meta: meta
        });
        return callback(err);
      }
      haibu.emit('npm:install:success', 'info', meta);
      callback();
    });
  });
};
