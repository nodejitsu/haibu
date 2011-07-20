//
// node bootstrap.js droneSocket haibuSocket
//
var carapace = require('haibu-carapace');
var path = require('path');
carapace.listen(process.argv[2],function () {
  //
  // Load in the proxy
  //
  console.dir('ready')
  carapace.use([path.join(__dirname, 'carapace-proxy.js')], function(err) {
    if(err) {
      console.error(err.stack)
      process.exit(1);
    }
    else {
      console.dir(process.argv)
      var bridge = require('dnode').connect(process.argv[3], function(client, conn) {
        conn.on('refused',function() {
          console.log('refused')
          console.dir(arguments)
        })
        conn.on('dump',function() {
          console.log('dump')
          console.dir(arguments)
        })
        conn.on('connect',function() {
          console.log('connect')
          console.dir(arguments)
        })
        conn.on('end',function() {
          console.log('end')
          console.dir(arguments)
        })
        conn.on('ready',function() {
          carapace.haibu = {
            client: client,
            connection: conn
          };
          client.on('drone.ready',function(){console.dir('emitting ready')});
          client.emit('drone.ready',process.argv[2]);
        })
      });
    }
  });
});
