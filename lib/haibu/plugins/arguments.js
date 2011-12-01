/*
 * Script argument common variable replacement plugin
 *
 * (C) 2010, Nodejitsu Inc.
 * (C) 2011, Sander Tolsma
 */

var haibu = require('../../haibu');

var arguments = exports;

//
// Name this plugin so it can be accessed by name
//
arguments.name = 'arguments';

//
// ### function init (options, callback)
// #### @options {Object} Options to initialize this plugin with
// #### @callback {function} Continuation to respond to when complete
// Initalizes the `arguments` plugin in the current `haibu` environment.
//
arguments.init = function (options, callback) {
  return callback()
};

//
// ### function argv (repo)
// #### @repo {Repository} Code repository we are spawning from
// Returns the appropriate spawn options for the `haibu.Spawner` for
// the `repo` along with extra options.
//
arguments.argv = function (repo) {
  // check all script arguments for replacement strings and replace with appropriate variables
  var args = (repo.app.scripts && repo.app.scripts.arguments) ? repo.app.scripts.arguments : [],
      ss = '%', 
      replacements = {
        'h': process.env.HOME,
        'a': repo.appDir,
        'c': repo.homeDir
      };

  args = (typeof args == 'string') ? args.split(' ') : args; 

  args.forEach(function(val, index) {
    var i, arg, repl;
    for (i = val.indexOf(ss); i != -1; i = val.indexOf(ss, i+1)) {
      arg = val[i+1];
      repl = (replacements[arg]) ? replacements[arg] : null;
      if (repl) val = val.replace(ss + arg, repl);
    }
    // put result back
    args[index] = val;
  });

  return {
    scriptArgs: args
  };
};