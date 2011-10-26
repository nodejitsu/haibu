/*
 * bin.js: Utilties for parsing command line arguments for haibu bin scripts.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs'),
    path = require('path'),
    utils = require('./index');

var bin = exports;

//
// ### function getAddress (address, callback) 
// #### @address {string} **Optional** Explicit address to use
// #### @callback {function} Continuation to respond to when complete
// Attempts to get the address for the current machine, if and explicit
// `address` is supplied, it will be eagerly supplied.
//
bin.getAddress = function (address, callback) {
  if (!callback) {
    callback = address;
    address = null;
  }
  else if (address) {
    return callback(null, address);
  }

  utils.getIpAddress(function (err, addr) {
    if (err) {
      addr = '127.0.0.1';
    }
    
    callback(null, addr);
  });
};

bin.findFile = function findFile(dir, file, callback) {
  var _file = path.join(dir, file);
  fs.stat(_file, function (err, exists) {  
    if (exists)
      callback(null, _file);
    else if(dir == '/')
      callback(new Error('could not find '+file));
    else
      return findFile(path.dirname(dir), file, callback);
  });
}

//
// ### function tryLoadCache (cachePath, callback) 
// #### @cachePatch {string} Path for the cache file
// #### @callback {function} Continuation to respond to when complete.
// Attempts to load the configuration data in `cachePath` or under
// `haibu/config/cache.json`.
//
bin.tryLoadCache = function (cachePath, callback) {
  if (!callback) {
    callback = cachePath;
    cachePath = null
  }
  function loadFile (cachePath) {
    fs.readFile(cachePath, function (err, data) {
      if (err) {
        return callback(err);
      }
    
      try {
        data = JSON.parse(data.toString());
        console.error('config/cache.json', data)
        callback(null, data.cache);
      }
      catch (ex) {
        callback(ex);
      }
    });
  }

  if(cachePath)
    return loadFile(cachePath)

  bin.findFile(__dirname, path.join('config', 'cache.json'), function (err, file) {
    if(err)
      return callback(err)
    loadFile(file)
  })        
};