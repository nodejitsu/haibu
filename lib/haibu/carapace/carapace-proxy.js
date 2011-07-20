var net = require('net');
var netListen = net.Server.prototype._doListen;
var binding = process.binding('net');
var bindingBind = binding.bind;

//
// Helper function from Node code to parse port arguments
// passed to net.prototype.Server.listen
//
function toPort(x) { 
  return (x = Number(x)) >= 0 ? x : false; 
}

//
// Cannot use port finder due to need for sync behavior
//
module.exports = function(carapace) {
  //
  // Setup proxy
  //
  carapace.proxy = {
    ports: {}
  };
  carapace.on('proxy:list', function(done) {
    done(carapace.proxy.ports);
  });
  function registerPort(desiredPort, actualPort) {
    carapace.proxy.ports[desiredPort] = actualPort;
    carapace.emit('proxy:map',desiredPort, actualPort);
  }
  //
  // Bind clobber
  // fd, port | unix, addr?
  //
  // Used to prevent a socket being bound to a port and instead use a different port
  //
  binding.bind = function bind() {
    var port = arguments[1];
    port = toPort(port);
    if(!port) {
      return bindingBind.apply(this,arguments);
    }
    var desiredPort = port;
    arguments[1] = undefined;
    var result = bindingBind.apply(this,arguments);
    var actualPort = binding.getsockname(arguments[0]).port;
    registerPort(desiredPort,actualPort);
    return result;
  }
  
  //
  // Server _doListen clobber
  //
  // This needs to be done because listen uses a cached bind
  // Listening on a port should be deferred to any port and a port mapping should be emitted
  //
  net.Server.prototype._doListen = function _doListen() {
    port = arguments[0];
    port = toPort(port);
    if(!port) {
      return netListen.apply(this,arguments);
    }
    var desiredPort = port;
    arguments[0] = undefined;
    var result = netListen.apply(this,arguments);
    var actualPort = this.address().port;
    registerPort(desiredPort,actualPort);
    return result;
  }
}
