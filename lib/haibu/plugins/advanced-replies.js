var haibu = require('../../haibu'),
  _sendResponse = haibu.sendResponse,
  fs = require('fs'),
  exec = require('child_process').exec,
  serverName = (fs.readFileSync('/etc/hostname') + '').trim();

  
var replies = exports;

replies.name = 'advanced-replies';

replies.init = function (done) {
  done();
};

replies.attach = function attach() {
  haibu.sendResponse = function sendResponse(res, status, body) {
    var that = this, $args = arguments;
    body.time = Date.now();
    body.server = serverName;
    //
    // TODO: Is there a way to be notified when IP changes?
    //  Doing this every time is a bit odd.
    //
    exec('ifconfig | grep \'inet addr:\' | grep -v \'127.0.0.1\' | cut -d: -f2 | awk \'{ print $1}\'', function (err, stdout, stderr) {    
      body.ips = (stdout + '').trim();
      return _sendResponse.apply(that, $args);
    })
  }
}