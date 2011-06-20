var reconf = require('reconf'),
    argv = require('optimist').argv;

module.exports = reconf(argv.c || argv.config || '.haibuconf', argv, {
  file : 'package.json',
  address : '127.0.0.1',
  port : 9002
});
