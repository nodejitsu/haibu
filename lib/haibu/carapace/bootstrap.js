//
// node bootstrap.js droneSocket haibuSocket
//
var carapace = require('haibu-carapace');
var path = require('path');
carapace.listen(process.argv[2],function () {
  //
  // Load in the proxy
  //
  carapace.use([path.join(__dirname, 'carapace-proxy.js')], function(err) {
    if(err) {
      process.exit(1);
    }
    else {
      var bridge = require('dnode').connect(process.argv[3], function(client, conn) {
        //TODO
        conn.on('refused',function() {
        })
        conn.on('dump',function() {
        })
        conn.on('connect',function() {
        })
        conn.on('end',function() {
        })
        conn.on('ready',function() {
          carapace.haibu = {
            client: client,
            connection: conn
          };
          client.emit('drone.ready',process.argv[2]);
        })
      });
    }
  });
});
