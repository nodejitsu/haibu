
var fs = require('fs'),
    path = require('path'),
    spawn = require('child_process').spawn,
    haibu = require('../../haibu');

var useraccounts = exports;

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
