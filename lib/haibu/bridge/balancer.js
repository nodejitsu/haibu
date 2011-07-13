var dnode = require('dnode');
//
// Bridge to balancer that should be 
//
function DroneBridge(balancer) {
  this.balancer = balancer;
}
DroneBridge.prototype.listen = function listen(server) {
  var self = this;
  dnode({
    heartbeat: function (cb) {
      cb();
    },
    app: function (app,cb) {
      self.balancer.addApp(app);
      cb();
    },
    drone: function(id,app,cb) {
      self.balancer.addDrone(id,app);
      cb();
    },
    proxies: function (mapping, cb) {
      for(var id in mapping) {
        var idPorts = mapping[id];
        for(var desired in idPorts) {
          self.balancer.proxy(desired, idPorts[desired]);
        }
      }
      cb();
    },
    proxy: function (id, desired, actual, cb) {
      self.balancer.proxy(desired, actual);
      cb();
    },
    plugin: function (codebase, cb) {
      //TODO
      cb();
    }
  }).listen(server);
}

module.exports = BalancerBridge;
