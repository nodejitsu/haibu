/*
 * index.js: Top level module include for log module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var winston = require('winston'),
    haibu = require('haibu');

//
// Define the set of loggers and inputs used by this module
//
var logger     = exports,
    loggers    = exports.loggers   = {},
    listening  = exports.listening = {}
    inputs     = exports.inputs    = ['haibu', 'drone'];
  
//
// Setup mapping of special namespaces to inputs 
//  
var namespaces = exports.namespaces = {
  'drone': 'drone'
};

var defaultConfig = {
  console: {
    level: 'silly',
    colorize: false
  }
};

//
// Define a value indicating if this module is initialized
//
logger.initialized = false;

//
// ### function init (options, callback) 
// #### @options {Object} Options to initialize this plugin with
// #### @callback {function} Continuation to respond to when complete
// Initalizes the `logger` plugin in the current `haibu` environment. 
//
logger.init = function (options) {
  if (logger.initialized) {
    return;
  }
  
  //
  // Monkey punch `haibu.emit` to allow for lazy listening
  // of logging events.
  //
  var _emit = haibu.emit;
  haibu.emit = function (ev) {
    if (ev !== 'newListener') {
      if (!listening[ev]) {
        listening[ev] = true;
        haibu.on(ev, function () {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(ev);
          logEvent.apply(null, args);
        });
      }

      _emit.apply(haibu, arguments);
    }
  };
  
  // Initialize a new winston logger for each input
  inputs.forEach(function (input) {
    logger.initInput(input, options);
  });
  
  logger.initialized = true;
};

//
// function initInput (input, options)
// Helper function for initializing individual
// inputs used by the logging module's methods
// e.g. drone, app, etc
//
logger.initInput = function (input, options) {
  var transports = [];

  //
  // Create the transports for this input. Here we are 
  // defaulting to Console and Loggly.
  //
  transports.push(new winston.transports.Console(options.console || defaultConfig.console));
  
  // Only add the Loggly transport if the input token is 
  // in the options passed to 'init' 
  if (options.loggly && options.loggly.inputs[input]) {
    transports.push(new winston.transports.Loggly({
      subdomain: options.loggly.subdomain,
      level: options.loggly.level || null,
      inputToken: options.loggly.inputs[input]
    }));
  }
  
  // 
  // Create the winston logger for this input. 
  //
  // Remark: forever will take care of this console output
  //         being saved to the appropriate file.
  //
  loggers[input] = new winston.Logger({ transports: transports });
  
  //
  // Define the core logging functions for all relevant inputs
  // ['drone', 'app'] <=> log.drone.info ...
  //
  logger[input] = loggers[input];
};

function logEvent (ev, level, msg, meta) {
  var name = ev.split(':')[0];
      input = namespaces[name] || 'haibu',
      log = loggers[input];
  
  if (!meta) {
    meta = msg;
    msg = null;
  }
  
  if (msg) {
    meta.desc = msg;
  }
  
  log[level](ev, meta);
};