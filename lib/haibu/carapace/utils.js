var carapace = require('haibu-carapace');
var forever = require('forever');
var dnode = require('dnode');
//
// Portfinder cannot be used due to https://github.com/joyent/node/issues/1331 causing broken pipes on a race condition
//
//var portfinder = require('portfinder');
var path = require('path');
var EventEmitter2 = require('eventemitter2').EventEmitter2;
var haibu = require('../../haibu')

var droneRoot = path.join(__dirname, '..', '..', '..', 'running','drone');
var i = 1;
var masterSocketPath = path.join(__dirname, '..', '..', '..', 'running','master');
var loaderPath  = path.join(__dirname, 'bootstrap.js');
//Generate a drone carapace for haibu
exports.spawn = function spawn(options, done) {
  socket = droneRoot + (i++) + '.sock';
    
  options.pidFile = options.pidFile || socket.replace(/[.]sock$/,'') + '.pid';
  options.silent = false;
  
  var monitor = new forever.Monitor(['node',loaderPath,socket, masterSocketPath],options);
  var drone = new EventEmitter2();
  drone.socket = socket;
  monitor.on('start',function(monitor, file, data) {
    drone.data = data;
  });
  monitor.start();
  
  var connected = false;
  function lookForDrone(event, droneSocket) {
    if (droneSocket !== socket) {
      return;
    }
    connected = true;
    haibu.socket.removeListener('drone.ready', lookForDrone);
    dnode.connect(socket, function(client, conn) {
      drone.forever = {
        monitor: monitor,
        options: options
      };
      drone.carapace = {
        client: client,
        connection: conn
      };
      return done(false,drone);
    });
  }
  
  setTimeout(function() {
    if(!connected) {
      haibu.socket.removeListener('drone.ready', lookForDrone);
      done(new Error('Timeout looking for drone to call back to haibu.'));
    }
  },200);
  haibu.socket.on('drone.ready', lookForDrone);
  
}

exports.load = function load(carapaceClient,events,cmd, done) {
  if(events.length) {
    carapaceClient.emit.apply(carapaceClient, events[0].concat(function onEventFinished(err) {
      if(err) {
        if(done) {
          done(err);
        }
      }
      load(carapaceClient,events.slice(1),cmd);
    }))
  }
  else {
    carapace.emit('run',cmd);
    if(done) {
      done();
    }
  }
}
