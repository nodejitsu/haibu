/*
 * pubsub.js: Plugin which publishes all events emitted by haibu to Redis pubsub channel(s). 
 *
 * (C) 2011, Nodejitsu Inc.
 *
 */

var redis = require('redis'),
    haibu = require('../../haibu');

var pubsub = exports;

pubsub.name = 'pubsub';

pubsub.init = function (options, callback) {
  var haibu.config.get('cache') || { host: 'localhost', port: 6379 },
      client = redis.createClient(redisConf.port, redisConf.host),
      _emit = haibu.emit;

  //
  // since Eventemitter2 is intended to be drop in compatible with EventEmitter,
  // it does not emit the event names, because EventEmitter doesn't
  //
  haibu.emit = function () {
    var args = new Array(arguments.length),
        i = arguments.length;
    while (i --) { args[i] = arguments[i]; }

    _emit.apply(haibu, args);
    client.publish(args[0], JSON.stringify(args.slice(1)));
  };

  return redisConf.auth
    ? client.auth(redisConf.auth, callback)
    : callback();
};