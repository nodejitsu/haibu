
var fs = require('fs'),
    path = require('path'),
    exec = require('child_process').exec,
    spawn = require('child_process').spawn,
    haibu = require('../../haibu');

var chroot = exports,
    _getSpawnOptions = haibu.getSpawnOptions;

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

haibu.getSpawnOptions = function getSpawnOptions(app) {
  var options = _getSpawnOptions.apply(this, arguments);

  if (options.env) {
    var pattern = new RegExp('(^|:)'+haibu.config.get('chroot').root.replace(/\W/g,'\\$&'));
    ['CPATH','LIBRARY_PATH','NODE_PREFIX','NODE_PATH','PATH', ].forEach(function(key) {
      if (!options[key]) {
        return;
      }
      
      options[key] = options[key].replace(pattern,'$1')
    });
  }

  return options;
}

haibu.common.npm.install = function (dir, target, callback) {
  var chrootDir = haibu.config.get('chroot').root,
      appDir = dir,
      stderr = '',
      chroot,
      args,
      meta;
      
  if (appDir.indexOf(chrootDir) === 0) {
    appDir = appDir.substr(chrootDir.length);
  }
  
  meta = {
    app: target.name,
    user: target.user,
    dependencies: target.dependencies
  };
  
  if (typeof target.dependencies === 'undefined' || Object.keys(target.dependencies).length === 0) {
    haibu.emit('npm:install:none', 'info', meta);
    return callback(null, []);
  }
  
  haibu.emit('npm:install:start', 'info', meta);
  
  function spawnNpm (err) {
    try {
      var spawnOptions = haibu.getSpawnOptions(target);
    }
    catch (e) {
      return callback(e);
    }
    args = [path.join(__dirname, '..', 'common', 'chroot-npm-install.js'), chrootDir, appDir];
    haibu.emit('npm:install:args', 'info', { args: args })
    
    chroot = spawn(spawnOptions.command || 'node', args, spawnOptions);
    chroot.stdout.on('data', function (data) {
      haibu.emit('npm:install:stdout', 'info', {
        data: data+'',
        meta: meta
      });
    });

    chroot.stderr.on('data', function (data) {
      stderr += data;
      haibu.emit('npm:install:stderr', 'info', {
        data: data+'',
        meta: meta
      });
    });

    chroot.on('exit', function (code) {
      if (code) {
        var err = new Error('NPM Install failed');
        err.code = code;
        err.result = stderr;
        err.blame = {
          type: 'user',
          message: 'NPM failed to install dependencies'
        };

        haibu.emit('npm:install:failure', 'info', {
          code: code,
          meta: meta
        });

        return callback(err);
      }

      haibu.emit('npm:install:success', 'info', meta);
      callback();
    });
  }
  
  function rewritePackage(done) {
    var pkgFile = path.join(chrootDir, appDir, 'package.json');
    fs.readFile(pkgFile, 'utf8', function (err, data) {
      if (err) {
        //
        // TODO: Write a stripped down version of the package in memory
        // if no package exists on disk.
        //
        return done(err);
      }
      
      var pkg;
      try {
        pkg = JSON.parse(data);
      }
      catch (ex) {
        //
        // TODO: Write a stripped down version of the package in memory
        // if there is an error in the package.json on disk.
        //
        return done(err);
      }
      
      pkg.dependencies = target.dependencies;
      fs.writeFile(pkgFile, JSON.stringify(pkg, null, 2), 'utf8', done);
    });
  }
  
  //
  // Rewrite the package.json in the chroot'ed app dir
  // and then invoke `npm install`.
  //
  rewritePackage(spawnNpm);
};