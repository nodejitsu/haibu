/*
 * config.js: Commands for the `config` resource in the haibu CLI.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */
 
var winston = require('winston'),
    colors = require('colors');

module.exports = function setupConfig (app) {
  app.usage('/config', function config (cmd, tty) {
    tty.info('');
    tty.info('haibu config'.bold.underline);
    tty.info('  Actions related to the haibu configuration file.');
    tty.info('');
    tty.info('notes'.bold);
    tty.info('  The configuration will be found recursively up the file system.');
    tty.info('  If no configuration file is found the HOME folder will be used.');
    tty.info('  A default configuration file will be created if none exist.');
    tty.info('');
    tty.info('commands'.bold);
    tty.info('  haibu config get'.green + ' <id>'.yellow);
    tty.info('  haibu config set'.green + ' <id> <value>'.yellow);
    tty.info('');
    tty.info('flags'.bold);
    tty.info('  -c --conf [.haibuconf]     The file to use as our configuration');
    tty.info('');
  });

  app.cli('/config/get/:id', function configGet (cmd, tty) {
    tty.info(cmd.params.id + ' = ' + (''+cmd.config.get(cmd.params.id)).yellow);
  });
  
  app.usage('/config/get', function configGetUsage (cmd, tty) {
    tty.info('');
    tty.info('haibu config get'.green + ' <id>'.yellow);
    tty.info('  Gets the value of a property in the haibu configuration');
    tty.info('  See `haibu config -h` for more details');
    tty.info('');
    tty.info('params'.bold);
    tty.info('  id - nconf compatible name of the property');
  });

  app.cli('/config/set/:id/:value', function configSet (cmd, tty) {
    cmd.config.set(cmd.params.id,cmd.params.value);
    cmd.config.save();
  });
  
  app.usage('/config/set', function configSetUsage (cmd, tty) {
    tty.info('');
    tty.info('haibu config set'.green + ' <id> <value>'.yellow);
    tty.info('  Sets the value of a property in the haibu configuration');
    tty.info('  See `haibu config -h` for more details');
    tty.info('');
    tty.info('params'.bold);
    tty.info('  id - nconf compatible name of the property');
    tty.info('  value - json compatible value of the property');
  });
}