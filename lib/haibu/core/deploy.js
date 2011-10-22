/*
 * deploy.js: Middleware for performing streaming deploys.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */
 
var fs = require('fs'),
    crypto = require('crypto'),
    http = require('http'),
    path = require('path'),
    spawn = require('child_process').spawn,
    BufferedStream = require('morestreams').BufferedStream,
    haibu = require('../../haibu');

exports.handler = function (drone, options) {
  //
  // Parsing a host field that looks like `::1 127.0.0.1 192.168.1.104` 
  // that is my current wifi's network address, not sure what this 
  // will translate to when it gets onto the cloud. So, just do this:
  //
  function simple(a, d) {
    var hosts = d.host.split(' '),
        host2 = hosts.pop(),
        host1 = hosts.pop();

    return {
      user: a.user,
      name: a.name,
      version: a.version, //change to hash of tar file
      ctime: d.ctime,
      host: host1 || host2,
      host2: host2,
      hash: d.hash,
      port: d.port,
      haibuPort: options.port
    };
  }

  return function (req, res) {
    //
    // Helper function for writing to the response object.
    //
    function send(status, body) {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    }

    //
    // Helper function to respond with the default `400: Bad Request`.
    //
    function usage() {
      send(400, { usage: "tar -cvz . | curl -sSNT- HOST/drones/deploy/USER/APP" });
    }

    var packagesDir = haibu.config.get('directories:packages'),
        url = req.url.split('/').slice(1),
        deploy = url[1],
        user = url[2],
        appName = url[3],
        all = [],
        tmpName,
        sha,
        bs;

    if (/POST|PUT/.test(req.method) && /\/drones\/deploy/.test(req.url)) {
      if (deploy !== 'deploy' || !user || !appName) {
        return usage();
      }

      bs = new BufferedStream();
      tmpName = path.join(packagesDir, user + '_' + appName + '_' + Date.now());
      sha = crypto.createHash('sha1');

      //
      // calculate the hash of tar file.
      // hmm, this comes out dfferent each time, because tar includes a timestamp.
      // still, at least it IDs the exact push.
      //
      req.on('data', function (d) {
        sha.update(d);
      });

      req.pipe(bs);
      fs.mkdir(tmpName, '0755', function (err) {
        var child = spawn('tar', ['-xz'], { cwd: tmpName }),
            stderr = '';

        child.stderr.on('data', function (data) {
          stderr += data;
        });

        bs.pipe(child.stdin);
        child.on('exit', function (code) {
          if (code || stderr.length) {
            return send(400, {
              error: 'tar -xzv exited with code:' + code,
              usage: 'tar -cvz . | curl -sSNT- HOST/drones/deploy/USER/APP',
              stderr: stderr
            });
          }

          var pkg, err;
          
          fs.readFile(path.join(tmpName, 'package.json'), 'utf8', function (err, json) {
            if (err) {
              return send(400, err);
            }

            try { pkg = JSON.parse(json) }
            catch (err) { return send(400, err) }

            pkg.user = user;
            pkg.name = appName;
            pkg.domain = pkg.domain || "nodejitsu.com";
            pkg.hash = sha.digest('hex');
            pkg.repository = {
              type: 'local',
              directory: tmpName,
            };

            //
            // sometimes drone.start does not callback.
            // my hunch is that it's when the hook server 
            // is not running?
            //
            drone.start(pkg, function (err, result) {
              if (err) {
                haibu.emit([user,appName,'error','service'].join(':'), 'error', err);
                return send(500, { error: err });
              }

              var s = simple(pkg, result);
              result.hash = pkg.hash;
              s.app = pkg;
              s.drone = result;
              s.ok = true;
              return send(200, s);
            });
          });
        });
      });
    }
    else if (/^GET/.test(req.method) && /^\/drones\/info/.test(req.url)) {
      //
      // extract just the needed information about the drones.
      //
      haibu.utils.each(drone.list(), function (v) {
        var a = v.app;
        haibu.utils.each(v.drones, function (d) {
          all.push(simple(a, d));
        });
      });

      return send(200, all);
    }
    else {
      return usage();
    }
  };
};