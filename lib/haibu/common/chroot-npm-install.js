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
if (process.installPrefix) {
  args.push('--prefix', process.installPrefix);
}

var npmInstall = spawn('npm', args, {
  cwd:appDir
});

npmInstall.stdout.on('data', function (data) {
  process.stdout.write(data);
});

npmInstall.stderr.on('data', function (data) {
  process.stderr.write(data);
});

npmInstall.on('exit', function (code) {
  process.exit(code);
});