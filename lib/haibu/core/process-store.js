/*
 * process-store.js: Keeps track of process files `app.package.json`, `app.pid.json`, etc.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var util = require('util'),
    fs = require('fs'),
    events = require('events'),
    path = require('path'),
    watch = require('watch'),
    haibu = require('haibu');

//
// ### function ProcessStore ()
// Constructor function for the ProcessStore responsible for 
// managing persistent `app.package.json` and `app.pid.json` 
// files in `haibu`.
//
var ProcessStore = exports.ProcessStore = function () {
  events.EventEmitter.call(this);
  
  this.runningDir = haibu.config.get('directories:running');
  this.active = {};
};

//
// Inherit from `events.EventEmitter`
//
util.inherits(ProcessStore, events.EventEmitter);

//
// ### function save (name, data, callback)
// #### @name {string} Application name for the file to save
// #### @data {Object} Data to save in the specified file
// #### @callback {function} Continuation to respond to when complete.
// Saves the specified `data` into an appropriate `package.json` or
// `pid.json` file for `haibu` on this machine.
//
ProcessStore.prototype.save = function (name, data, callback) {  
  //
  // Save the data to the correct filepath for this type of data.
  //
  var filepath = this._filename(name, data);
  fs.writeFile(filepath, JSON.stringify(data, null, 2), function (err) {
    return err ? callback(err) : callback(null, filepath);
  });
};

//
// ### function remove (name, data, callback)
// #### @name {string} Application name for the file to remove.
// #### @data {Object} Data in the specified file to remove.
// #### @callback {function} Continuation to respond to when complete.
// Removes the file with `data` for the application with the specified `name`.
//
ProcessStore.prototype.remove = function (name, data, callback) {
  //
  // Remove the file, ignoring any errors that are returned.
  //
  var filepath = this._filename(name, data);
  fs.unlink(filepath, function (err) {
    callback();
  });
};

//
// ### function monitor ()
// Starts monitoring all files in the `runningDir` for this 
// ProcessStore instance.
//
ProcessStore.prototype.monitor = function () {
  var self = this;
  
  watch.createMonitor(this.runningDir, function (monitor) {
    self.emit('load', monitor.files);
    
    monitor.on('created', function (file, curr, prev) {
      if (curr.isFile()) {
        self.emit('created', file);
      }
    });
    
    monitor.on('removed', function (file, stats) {
      if (stats.isFile()) {
        self.emit('removed', file);
      }
    });
  });
};

//
// ### private function _filename (name, data) 
// #### @name {string} Application name for the filename.
// #### @data {Object} Data in the specified filename to generate.
// Generates the appropriate filename (e.g. `app.package.json` or 
// `app.12345.json`) for the specified `name` and `data`.
//
ProcessStore.prototype._filename = function (name, data) {
  var ext = data.pid || (data._id, 'package'),
      filename = [name, ext, 'json'].join('.');
  
  //
  // Save information about applications at `appname.package.json`
  // and save pid information at `appname.pid.json`
  //    
  return filepath = path.join(this.runningDir, filename);
};