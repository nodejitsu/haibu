var dnode = require('dnode');
var path = require('path');
var net = require('net');
var url = require('url');
//
// Bridge to master that should be 
//
function MasterBridge(master) {
  this.master = master;
  var server = net.createServer();
  server.listen(path.resolve(master.config.get('socketPath') || path.join(__dirname,'..','..','..','service')));
  this.server = dnode({
    heartbeat:function(id,cb){
      cb()
    },
    proxy:function(id,desired,actual,cb){
      var dronePorts = master.running.ports[id] || (master.running.ports[id] = {});
      dronePorts[desired] = actual;
      master.emit('drone:proxy',id,desired,actual);
      cb();
    },
    listen:function(postback,cb) {
      var dest = url.parse(postback);
      function emitProxy(remote,conn) {
        remote.proxies(master.running.ports);
        master.on('drone:proxy',function(id,desired,actual){
          remote.proxy(id,desired,actual);
        });
      }
      if(dest.hostname) {
        dest.port = dest.port || 80;
        dnode.connect(dest.hostname,dest.port, emitProxy);
      }
      else if(dest.pathname) {
        dnode.connect(path.resolve(dest.pathname), emitProxy);
      }
      else {
        return cb('Unable to resolve hook "'+postback+'"');
      }
      return cb();
    }
  }).listen(server);
}
exports.MasterBridge = MasterBridge;
