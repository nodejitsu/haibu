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