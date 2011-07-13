var dnode = require('dnode');
//
// Bridge to master that should be 
//
function DroneBridge(drone) {
  this.drone = drone;
}
DroneBridge.prototype.listen = function listen(server) {
  var self = this;
  dnode({
    heartbeat: function (cb) {
      cb(Date());
    },
    proxies: function(drone, desired, actual, cb) {
      cb(self.drone.proxies);
    },
    plugin: function(codebase) {
      
    }
  }).listen(server);
}

module.exports = DroneBridge;
