//
// Put NPM into a CHROOT for `npm install`
//
// node chroot-npm-install.js chrootDir appDir
//
var daemon = require('daemon'),
    spawn = require('child_process').spawn,
    chrootDir = process.argv[2],
    appDir = process.argv[3];
  
daemon.chroot(chrootDir);

var args = ['install'];

if (process.installPrefix || !process.env.NODE_PREFIX) {
  process.env.NODE_PREFIX = process.env.NODE_PREFIX || process.installPrefix;
}

var npmInstall = spawn('npm', args, {
  cwd: appDir,
  env: process.env
});

npmInstall.stdout.on('data', function (data) {
  process.stdout.write(data);
});

npmInstall.stderr.on('data', function (data) {
  process.stderr.write(data);
});

npmInstall.on('exit', function (code) {
  if (code) {
    return process.exit(code);
  }
  spawn('chmod', ['-R', '777', '.'], {
    cwd: appDir
  }).on('exit', function (exitCode) {
    process.exit(exitCode);
  });
});
