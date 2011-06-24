var winston = require('winston');
var colors = require('colors');

module.exports = function setupConfig(app) {
  app.usage('/config',function config(req,res) {
    res.info('');
    res.info('haibu config'.bold.underline);
    res.info('  Actions related to the haibu configuration file.');
    res.info('');
    res.info('notes'.bold);
    res.info('  The configuration will be found recursively up the file system.');
    res.info('  If no configuration file is found the HOME folder will be used.');
    res.info('  A default configuration file will be created if none exist.');
    res.info('');
    res.info('commands'.bold);
    res.info('  haibu config get'.green + ' <id>'.yellow);
    res.info('  haibu config set'.green + ' <id> <value>'.yellow);
    res.info('');
    res.info('flags'.bold);
    res.info('  -c --conf [.haibuconf]     The file to use as our configuration');
    res.info('');
  });

  app.cli('/config/get/:id',function configGet(req,res) {
    res.info(req.params.id + ' = ' + (''+req.config.get(req.params.id)).yellow);
  });
  app.usage('/config/get',function configGetUsage(req,res) {
    res.info('');
    res.info('haibu config get'.green + ' <id>'.yellow);
    res.info('  Gets the value of a property in the haibu configuration');
    res.info('  See `haibu config -h` for more details');
    res.info('');
    res.info('params'.bold);
    res.info('  id - nconf compatible name of the property');
  });

  app.cli('/config/set/:id/:value',function configSet(req,res) {
    req.config.set(req.params.id,req.params.value);
    req.config.save();
  });
  app.usage('/config/set',function configSetUsage(req,res) {
    res.info('');
    res.info('haibu config set'.green + ' <id> <value>'.yellow);
    res.info('  Sets the value of a property in the haibu configuration');
    res.info('  See `haibu config -h` for more details');
    res.info('');
    res.info('params'.bold);
    res.info('  id - nconf compatible name of the property');
    res.info('  value - json compatible value of the property');
  });
}
