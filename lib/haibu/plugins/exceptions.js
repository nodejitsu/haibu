/*
 * exceptions.js: Plugin responsible for logging all uncaughtExceptions haibu.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var winston = require('winston'),
    haibu = require('../../haibu');

var exceptions = exports;

//
// Setup default state for the exceptions plugin
//
exceptions.name       = 'exceptions';
exceptions.initalized = false;

var defaultConfig = exceptions.defaultConfig = {
  console: {
    level: 'silly',
    colorize: false
  }
};

exceptions.init = function (options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  callback       = callback       || function () { };
  options        = options        || {};
  options.loggly = options.loggly || haibu.config.get('loggly');

  if (exceptions.initalized) {
    return callback();
  }

  var exceptionHandlers = [];

  //
  // Create the exceptionHandlers defaulting to Console and Loggly.
  //
  exceptionHandlers.push(new winston.transports.Console(options.console || defaultConfig.console));

  //
  // Only add the Loggly transport if the input token is
  // in the options passed to 'init'
  //
  if (options.loggly && options.loggly.inputs['exceptions']) {
    exceptionHandlers.push(new winston.transports.Loggly({
      json:       options.loggly.json !== false,
      inputToken: options.loggly.inputs['exceptions'],
      level:      options.loggly.level || null,
      subdomain:  options.loggly.subdomain
    }));
  }

  //
  // Update the state of the plugin with the logger.
  //
  exceptions.logger = new winston.Logger({ 
    exceptionHandlers: exceptionHandlers,
    //
    // There is a current bug in node that throws here:
    //
    // https://github.com/joyent/node/blob/v0.4.12/lib/net.js#L159
    //
    // It will throw a broken pipe error (EPIPE) when a child process that you 
    // are piping to unexpectedly exits. The write function on line 159 is 
    // defined here:
    //
    // https://github.com/joyent/node/blob/v0.4.12/lib/net.js#L62
    //
    // This uncaughtExceptionHandler will catch that error,
    // and since it originated with in another sync context,
    // this section will still respond to the request.
    //
    exitOnError: function (err) {
      if (err.code === 'EPIPE') {
        console.log('expected error:');
        console.log('EPIPE -- probabaly caused by someone pushing a non gzip file.');
        console.log('"net" throws on a broken pipe, current node bug, not haibu.');
        return false;
      }
      
      return true;
    }
  });
  exceptions.initalized = true;

  //
  // Have the logger handle uncaught exceptions.
  //
  exceptions.logger.handleExceptions();
  callback();
};