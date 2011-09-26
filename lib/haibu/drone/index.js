/*
 * index.js: Top-level include for the drone module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs'),
    path = require('path'),
    async = require('async'),
    hookio = require('hook.io'),
    haibu = require('../../haibu'),
    http = require('http')
    ;

//
// ### Include Exports
// Export other components in the module
//
exports.createRouter = require('./service').createRouter;
exports.Drone        = require('./drone').Drone;
exports.Client       = require('./client').Client;
exports.started      = false;

//
// ### function createServer (options)
// #### @options {Object} Options to use when creating this server
//
// Creates a server for the haibu `drone` webservice. 
//

//
// (dominictarr) i've added a streaming interface for push commits.
// see lib/haibu/deploy
//
exports.createServer = function (options) {
  var drone = new haibu.drone.Drone(options),
      router = haibu.drone.createRouter(drone),
      contentTypes = { 'application/json': router },
      handler = haibu.utils.handler({ contentTypes: contentTypes, port: options.port }),
      streaming = require('../deploy').handler(drone)

    var server = http.createServer(function (req, res) {
      if(/^\/(deploy|info)/.test(req.url)) {
        streaming(req, res) //streaming interface.
      } else {
        handler(req, res) //buffering interface.
      }
    })

  // this breaks the nodejs idiom of createServer. 
  // createServer should not return a server that is already listening.
  // if it does this it should be called startServer
  
  if (options.port) { 
    server.listen(options.port);
  }
  
  server.drone = drone;
  return server;
};

//
// ### function startHook (options, callback)
// #### @options {Object} Options for the `hookio.Hook` instance.
// #### @callback {function} Continuation to respond to when complete.
// Starts a new `hookio.Hook` for this `haibu` process.
//
exports.startHook = function (options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = null;
  }
  
  options = options || { name: 'haibu' };
  console.error(options)
  var hook = new hookio.Hook(options);
  console.error('HOOK PORT?', options['hook-port'])
  hook.listen(options, function (err) {
    haibu.running.hook = hook;
    return err ? callback(err) : callback(null, hook);
  });
};

//
// ### function autostart (server, callback)
// #### @server {http.Server} Haibu drone server to autostart drones with.
// #### @callback {function} Continuation to respond to when complete
// Autostarts drones for all applications persisted to 
// `haibu.config.get('directories:autostart')`.
//
exports.autostart = function (server, callback) {
  var autostartDir = haibu.config.get('directories:autostart');
  
  //
  // Helper function which starts multiple drones
  // a given application.
  //
  function startDrones (pkg, done) {
    if (pkg.drones == 0) {
      return done();
    }

    var started = 0;

    async.whilst(function () {
      return started < pkg.drones;
    }, function (next) {
      started++;
      server.drone.start(pkg, next);
    }, done);
  }
  
  //
  // Find all drones in directory:
  //   %dir/%sanitized_name.json
  //
  fs.readdir(autostartDir, function (err, files) {
    if (err) {
      return callback(err);
    }

    async.map(files, function (file, next) {
      //
      // Read each `package.json` manifest file and start
      // the appropriate drones in this `haibu` instance.
      //
      fs.readFile(path.join(autostartDir, file), function (err, pkg) {
        if (err) {
          return callback(err);
        }

        //
        // Read the contents of the package.json manifest, 
        // which should be JSON
        //
        try {
          pkg = JSON.parse(pkg.toString());
        } 
        catch (ex) {
          return callback(ex);
        }

        startDrones(pkg, next);
      });
    }, callback);
  });
}

//
// ### function start (options, callback)
// #### @options {Object} Options to use when starting this module.
// #### @callback {function} Continuation to respond to when complete.
// Starts the haibu `drone` webservice with the specified options.
//
exports.start = function (options, callback) {
  if (exports.started) {
    return callback(null, haibu.running.server);
  }
  
  function tryAutostart (server) {
    exports.autostart(server, function (err) {
      // 
      // Ignore errors from autostart and continue
      // bringing up the haibu `drone` server. 
      //
      // Remark: We should report the `err` somewhere
      //
      callback(null, server);
    });
  }
  
  function loadPlugins (server, plugins) {
    async.forEach(plugins, function (plugin, next) {
      haibu.use(plugin, next);
    }, function () {
      tryAutostart(server);
    })
  }
  
  function startServer (err, hook) {
    if (err) {
      return callback(err);
    }
    
    //
    // Create the server and add the new `http.Server`
    // and `haibu.drone.Drone` instance into the `haibu.running`
    // namespace.
    //
    var server = exports.createServer(options);

    haibu.running.server = server;
    haibu.running.hook = hook;
    haibu.running.drone  = server.drone;
    haibu.running.ports  = {};
    
    //
    // If plugins have been passed in `options` then 
    // load them asynchronously. If not, then immediately
    // attempt to autostart any applications and respond.
    //
    return options.plugins && options.plugins.length 
      ? loadPlugins(server, options.plugins)
      : tryAutostart(server);
  }
  
  function startHook (err) {
    return err 
      ? callback(err)
      : exports.startHook(options, startServer);
  }

  //
  // Indicate that `haibu.drone` has started
  //
  exports.started = true;

  //
  // carapace uses hook.io to tell the master what port it's opened on.
  //

  return options.init !== false
    ? haibu.init(options, startHook)
    : startHook();
    

  return options.init !== false
    ? haibu.init(options, startServer)
    : startServer();
  
};

//
// ### function stop (callback)
// #### @cleanup {bool} (optional) Remove all autostart files (default=true).
// #### @callback {function} Continuation to respond to when complete.
// Gracefully stops `drone` instance
//
exports.stop = function (cleanup, callback) {
  if (!callback && typeof cleanup === 'function') {
    callback = cleanup;
    cleanup = true;
  }
  
  if (!exports.started) {
    return callback ? callback() : null;
  }

  exports.started = false;

  haibu.running.server.close();
  haibu.running.hook.server.close();

  // Terminate drones
  haibu.running.drone.destroy(cleanup, callback || function () {});
  haibu.running = {};
};