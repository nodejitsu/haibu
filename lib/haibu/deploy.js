var http = require('http')
  , fs = require('fs')
  , spawn = require('child_process').spawn
  , BufferedStream = require('morestreams').BufferedStream
  , join = require('path').join
  , haibu = require('../haibu')
  , u = require('ubelt')
  , crypto = require('crypto')
  , port = 9003
  ;

exports.handler = function (drone, options) {
  /*
    there is a current bug in node that throws here:
  
    https://github.com/joyent/node/blob/v0.4.12/lib/net.js#L159
  
    it will throw a broken pipe error (EPIPE) when a child process that you are piping to unexpectedly exits.
  
    the write function on line 159 is defined here:
  
    https://github.com/joyent/node/blob/v0.4.12/lib/net.js#L62

    this uncaughtExceptionHandler will catch that error,
    and since it originated with in another sync context, 
    this section will still respond to the request.
  
  */
  function simple (a, d) {
    //im getting a host field that looks liko
    // ::1 127.0.0.1 192.168.1.104
    // that is my current wifi's network address, not sure what this will translate to
    // when it gets onto the cloud.
    // so, i'm just gonna do this:
    
    var hosts = d.host.split(' ')
      , host2 = hosts.pop()
      , host1 = hosts.pop()
      
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
    }
  }

  process.on('uncaughtException', function (err) {
    if (err && err.code == 'EPIPE') {
        console.error('expected error:')
        console.error('EPIPE -- probabaly caused by someone pushing a non gzip file.')        
        console.error('"net" throws on a broken pipe, current node bug, not haibu.')        
    } else 
    throw err
  })

  return function (req, res) {
    function send (status, body) {
      res.writeHead(status, {'content-type': 'application/json'})
      res.end(JSON.stringify(body))
    }

    function usage () {
      send(400,{usage: "tar -cvz . | curl -sSNT- HOST/deploy/USER/APP"})  
    }

    if (/POST|PUT/.test(req.method) && /\/deploy/.test(req.url)) {
      var url = req.url.split('/')
        , deploy = url[1]
        , user = url[2]
        , appName = url[3]

      if(deploy == 'deploy' && user && appName) {
        var bs = new BufferedStream () //buffers the stream until it's piped to something.
        var tmpName = join('/tmp', user + '_' + appName + '_' + Date.now())
        var sha = crypto.createHash('sha1')

        //calculate the hash of tar file. 
        //hmm, this comes out dfferent each time, because tar includes a timestamp.
        //still, at least it IDs the exact push.
        req.on('data', function (d) {sha.update(d)})

        req.pipe(bs)
        fs.mkdir(tmpName, 0755, function (err) {
          var child = spawn('tar', ['-xz'], {cwd: tmpName})
            , stderr = ''
          child.stderr.on('data', function(data) { stderr += data})

          bs.pipe(child.stdin)
          child.on('exit', function (code) {
            if(code) //probably not in gzip format
              return send(400, {
                error: 'tar -xzv exited with code:' + code,
                stderr: stderr,
                usage: 'tar -cvz . | curl -sSNT- HOST/deploy/USER/APP'
              })

            var pkg, err
            try {
              //make this async when I refactor this all to use ctrlflow
              pkg = JSON.parse(fs.readFileSync(join(tmpName, 'package.json'), 'utf-8'))
            } catch (err) {
              return send(400, err)
            }
            pkg.user = user
            pkg.name = appName
            pkg.domain = "nodejitsu.com"
            pkg.hash = sha.digest('hex')
            pkg.repository = {
                type: 'local',
                directory: tmpName,
              }

            //
            // sometimes drone.start does not callback.
            // my hunch is that it's when the hook server is not running?
            drone.start(pkg, function (err, result) {
              if (err) {
                haibu.emit('error:service', 'error', err);
                return send(500, { error: err })
              }
              var s = simple(pkg, result)
              result.hash = pkg.hash 
              s.app = pkg
              s.drone = result
              s.ok = true
              return send(200, s)
            });

          })
        })
      } else return usage()
    } else if (/^GET/.test(req.method) && /^\/info/.test(req.url)) {
      var all = []
      //extract just the needed information about the drones.
      u.each(drone.list(), function (v) {
        var a = v.app
        u.each(v.drones, function (d) {
          all.push(simple(a,d))
        })
      })
      return send(200, all)
    } else
      return usage()
  }
}
