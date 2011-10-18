

var redis = require('redis'),
    haibu = require('../../haibu');

var pubsub = exports;

pubsub.init = function (options, callback) {

  //
  // since Eventemitter2 is intended to be drop in compatible with EventEmitter,
  // it does not emit the event names, because EventEmitter doesn't
  //

  var redisConf = (options && options.config && options.config.cache) || {host: 'localhost', port: 6379};

  var client = redis.createClient(redisConf.port,redisConf.host);

  var _emit = haibu.emit;

  haibu.emit = function () {
    var args = new Array(arguments.length),
        i = arguments.length;
    while (i --) { args[i] = arguments[i]; }

    _emit.apply(haibu, args);
    client.publish(args[0], JSON.stringify(args.slice(1)));
  };

  if(redisConf.auth) {
    client.auth(redisConf.auth, callback);
  } else {
    callback();
  }
}

pubsub.name = 'pubsub';