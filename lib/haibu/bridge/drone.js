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
    //Used by master to make sure this drone is alive
    heartbeat: function (cb) {
      cb(Date());
    },
    //Used by master to get CPU info
    proxies: function(drone, desired, actual, cb) {
      cb(self.drone.proxies);
    },
    plugin: function(codebase) {
      
    }
  }).listen(server);
}

module.exports = DroneBridge;
