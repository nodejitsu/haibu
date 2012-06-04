
var fs = require('fs'),
    path = require('path'),
    spawn = require('child_process').spawn,
    haibu = require('../../haibu');

var useraccounts = exports;

function makeNPMConfiguration(dir, target, callback) {
  haibu.utils.mkdirp(path.join(dir,'..','.npm'), function (err) {
    if (err) {
      callback(err);
      return;
    }
    var todo = 2;
    function finish(err) {
      if (err) {
        todo = 0;
        callback(err);
        return;
      }
      todo--;
      if (todo === 0) {
        callback();
      }
    }
    fs.writeFile(path.join(dir,'..','.userconfig'), '', finish);
    fs.writeFile(path.join(dir,'..','.globalconfig'), '', finish);
  });
}

function spawnNPM(dir, target, callback) {
  var appDir = dir,
      stderr = '',
      args,
      meta;
  
  meta = {
    app: target.name,
    user: target.user,
    dependencies: target.dependencies
  };
  if (typeof target.dependencies === 'undefined' || Object.keys(target.dependencies).length === 0) {
    haibu.emit('npm:install:none', 'info', meta);
    callback(null, []);
    return;
  }
  
  haibu.emit('npm:install:start', 'info', meta);
  
  function spawnNpm (err) {
    try {
      var spawnOptions = haibu.getSpawnOptions(target);
    }
    catch (e) {
      callback(e);
      return;
    }
    args = [
            //only use cache for app
            '--cache', path.join(dir,'..','.npm'),
            //use blank or non-existent user config
            '--userconfig', path.join(dir,'..','.userconfig'),
            //use non-existant user config
            '--globalconfig', path.join(dir,'..','.globalconfig'),
            'install'
            ];
    haibu.emit('npm:install:args', 'info', { args: args })
    
    child = spawn('npm', args, spawnOptions);
    child.stdout.on('data', function (data) {
      haibu.emit('npm:install:stdout', 'info', {
        data: data+'',
        meta: meta
      });
    });

    child.stderr.on('data', function (data) {
      stderr += data;
      haibu.emit('npm:install:stderr', 'info', {
        data: data+'',
        meta: meta
      });
    });

    child.on('exit', function (code) {
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

        callback(err);
        return;
      }

      haibu.emit('npm:install:success', 'info', meta);
      callback();
    });
  }
  
  function rewritePackage(done) {
    var pkgFile = path.join(appDir, 'package.json');
    fs.readFile(pkgFile, 'utf8', function (err, data) {
      if (err) {
        //
        // TODO: Write a stripped down version of the package in memory
        // if no package exists on disk.
        //
        done(err);
        return;
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
        done(err);
        return;
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

haibu.common.npm.install = function (dir, target, callback) {
  makeNPMConfiguration(dir, target, function (err) {
    if (err) {
      callback(err);
      return;
    }
    spawnNPM(dir, target, callback);
  })
};

useraccounts.name = 'useraccounts';

useraccounts.argv = function (repo) {
  var user = repo.app.user;
  return { argv: ['--plugin',
        'setuid',
        '--setuid',
        haibu.config.get('useraccounts:prefix') + user] };
}

useraccounts.attach = function (options) {
  if (process.getuid() !== 0) {
    throw new Error('useraccounts plugin requires admin privileges.');
  }
  
  haibu.config.set('useraccounts:prefix', 'haibu-');
  
  
  var _install = haibu.common.npm.install;
  haibu.common.npm.install = function install(dir, target, callback) {
    var self = this;

    var env = {};
    for(var k in process.env) {
      env[k] = process.env[k];
    }

    var user = env.USER = haibu.config.get('useraccounts:prefix') + target.user;
    var appdir = env.HOME = path.join(haibu.config.get('directories:apps'), target.user);
    var child = spawn('bash', [path.join(__dirname, '..', 'common', 'adduser.sh')], {
        env: env
     });
    child.on('exit', function (code) {
        haibu.emit('useraccounts:adduser:exit', 'info', {
           exitCode: code
        })
        if (code === 0) {
          _install.call(self, dir, target, changePermissions);
        }
        else {
           callback(new Error('Unable to create user'));
        }
    });
    
    function changePermissions(err) {
      if (err) {
        callback(err);
        return;
      }

      spawn('chown', ['-R', user + ':nogroup', appdir + '/' + target.name]).on('exit', function (exitCode) {
        haibu.emit('useraccounts:chown:exit', 'info', {
           exitCode: exitCode
        })
        if (exitCode) {
          callback(new Error('Unable to grab ownership for files'));
        }
        else {
          spawn('chmod', ['-R', '770', appdir]).on('exit', function (exitCode) {
            haibu.emit('useraccounts:chmod:exit', 'info', {
               exitCode: exitCode
            })
            if (exitCode) {
              callback(new Error('Unable to change permissions for files'));
            }
            else {
              callback();
            }
          });
        }
      });
    }
  }
};

useraccounts.init = function (done) {
  done();
};
