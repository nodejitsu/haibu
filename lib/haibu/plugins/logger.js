/*
 * logger.js: Plugin responsible for logging all relevant events from haibu.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var winston = require('winston'),
    haibu = require('../../haibu');

//
// Define the set of loggers and inputs used by this module
//
var logger     = exports,
    loggers    = exports.loggers   = {},
    listening  = exports.listening = {}
    inputs     = exports.inputs    = ['haibu', 'user', 'error'];

//
// Setup mapping of special namespaces to inputs
//
exports.name       = 'logger';
exports.namespaces = {
  drone: 'user',
  error: 'error'
};

var defaultConfig = exports.defaultConfig = {
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
logger.init = function (options, callback) {
  if (logger.initialized) {
    return;
  }

  options        = options        || {};
  options.loggly = options.loggly || haibu.config.get('loggly');

  //
  // Monkey punch `haibu.emit` to allow for lazy listening
  // of logging events.
  //
  logger._logAll(haibu);

  // Initialize a new winston logger for each input
  inputs.forEach(function (input) {
    logger.initInput(input, options);
  });

  logger.initialized = true;
  callback();
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
      json:       options.loggly.json !== false,
      inputToken: options.loggly.inputs[input],
      level:      options.loggly.level || null,
      subdomain:  options.loggly.subdomain
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

//
// ### function logEvent (ev, level, msg, meta)
// #### @ev {string} Name of the event to log
// #### @level {string} Level to log the event at
// #### @msg {string} Message to log at the specified level
// #### @meta {Object} Metadata for this event to log
// Logs the specified event `ev` with the `level`, `msg`
// and `meta` supplied.
//
logger.logEvent = function (ev, level, msg, meta) {
  var name = ev.split(':')[0];
      input = exports.namespaces[name] || 'haibu',
      log = loggers[input];

  if (!log[level]) {
    return;
  }

  if (!meta) {
    meta = msg;
    msg = null;
  }

  if (msg) {
    meta.desc = msg;
  }

  log[level](ev, meta);
};

//
// ### private function _logAll (emitter)
// #### @emitter {events.EventEmitter} Emitter to log all events from
// Monkey punch `emitter.emit` to allow for lazy listening
// of logging events.
//
logger._logAll = function (emitter) {
  //
  // Store a reference to the original `emitter.emit` function
  //
  var _emit = emitter.emit;

  //
  // Overwrite `emitter.emit` to lazily add a listener to any
  // event if the boolean flag is not set in `logger.listening`.
  //
  emitter.emit = function (ev) {
    if (ev !== 'newListener') {
      if (!listening[ev]) {
        listening[ev] = true;
        emitter.on(ev, function () {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(ev);
          logger.logEvent.apply(null, args);
        });
      }

      //
      // Call the original `emitter.emit` function now that
      // (potentially) a new listener has been added.
      //
      _emit.apply(emitter, arguments);
    }
  };
};
