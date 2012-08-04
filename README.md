# haibu

<img src="https://github.com/nodejitsu/haibu/raw/master/examples/haibu.png"/></img>

*spawn your own node.js clouds, on your own hardware*

# What is haibu?

haibu is the open-source [node.js](http://nodejs.org) project used at [Nodejitsu's](http://nodejitsu.com) for spawning and managing several node.js applications on a single server. It's an integral part of our production stack and is fully supported.

# How does it work?

haibu (which is Japanese for "hive") recieves commands for spawning, transforming, and managing multiple node.js applications. Haibu utilizes a unique approach by wrapping spawned Node.js applications in a "[Carapace](https://github.com/nodejitsu/haibu-carapace)" which allows haibu to extend spawned applications with all sorts of additional functionaltiy. When haibu wraps a node.js application in a "carapace" the application becomes a "drone".

This approach allows haibu to directly interact with node.js applications and add all sorts of additional functionality. [Carapace](https://github.com/nodejitsu/haibu-carapace) also contains a plugin system including functionality for things like: chroot, chdir, and even a [http://hook.io](hook.io) bridge.

## Where can I run haibu?

`haibu` doesn't discriminate. If your environment supports node.js, you can install `haibu` and start up your own node.js cloud. This makes `haibu` an ideal tool for both development purposes and production usage since you can seamlessly setup haibu on your local machine, on utility computing providers (such as Amazon EC2 or Rackspace), on dedicated servers, or even on a mobile phone!

# Installation

    [sudo] npm install haibu -g

# An overview of using haibu

## Starting up a haibu

```
[sudo] node bin/haibu
(...)
haibu started @ 127.0.0.1 on port 9002 as api-server
```

**Now that there is a haibu server running, we can begin to interact with it's API.**

##Starting an application using the haibu Client
*(From: /examples/hello-spawn.js)*

Allows you to call haibu programmatically from inside your node.js scripts.

```javascript
var eyes = require('eyes'),
    haibu = require('haibu');

// Create a new client for communicating with the haibu server
var client = new haibu.drone.Client({
  host: 'localhost',
  port: 9002
});

// A basic package.json for a node.js application on haibu
var app = {
   "user": "marak",
   "name": "test",
   "domain": "devjitsu.com",
   "repository": {
     "type": "git",
     "url": "https://github.com/Marak/hellonode.git",
   },
   "scripts": {
     "start": "server.js"
   }
};

// Attempt to start up a new application
client.start(app, function (err, result) {
  if (err) {
    console.log('Error spawning app: ' + app.name);
    return eyes.inspect(err);
  }

  console.log('Successfully spawned app:');
  eyes.inspect(result);
});


client.start(app, function (err, result) {
  eyes.inspect(err);
  eyes.inspect(result);
});
```

## Push deploy

``` bash
cd path/to/your/app
tar -cz . | curl -XPOST -sSNT- localhost:9002/deploy/username/appname
# or, like this:
tar -czf app.tgz .
curl -XPOST -sSNT app.tgz localhost:9002/deploy/username/appname

```
> NOTE: you will need to invoke `tar -czf app.tgz .` inside your app's directory
> else it will add directories inside the tarball that will confuse haibu.
> haibu only accepts gzip format.

or, programmatically:

``` js
  var request = require('request')
    , fs = require('fs');
    
  fs.createReadStream(tarball)
    .pipe(request.put({url: 'http://localhost:9002/deploy/username/appname'}, function (err, res, body) {
      var result = JSON.parse(body) //app information
    })
  
```

## RESTful Webservice

If you need to integrate non-node.js systems with haibu, you can use haibu's RESTful JSON API. We recommend using haibu's native Node.js Client, but if you need to integrate with non-node.js systems this is not always a viable option.

**Starting an application through the webservice**

    POST http://127.0.0.1:9002/drones/test/start
    ...
    {
        "start": {
            "user": "marak",
            "name": "test",
            "domain": "devjitsu.com",
            "repository": {
                "type": "git",
                "url": "https://github.com/Marak/hellonode.git"
            },
            "scripts": {
                "start": "server.js"
            }
        }
    }

 **Response**

    HTTP/1.1 200 OK
    Date: Thu, 05 May 2011 18:15:36 GMT
    Server: journey/0.4.0
    Content-Type: application/json
    Content-Length: 353
    Connection: close
    ...
    {
        drone: {
            uid: 'gbE3',
            ctime: 1304619335818,
            pid: 7903,
            foreverPid: 7195,
            logFile: '/Users/Charlie/.forever/gbE3.log',
            options: [ '/Users/Charlie/Nodejitsu/haibu/local/marak/test/hellonode/server.js', '127.0.0.1', 8001 ],
            file: '/Users/Charlie/Nodejitsu/haibu/bin/carapace',
            pidFile: '/Users/Charlie/.forever/pids/gbE3.pid',
            port: 8001,
            host: '127.0.0.1'
        }
    }

**Stopping an application through the webservice**


    POST http://127.0.0.1:9002/drones/test/stop
    ...
    {
        "stop": {
            "name": "test"
        }
    }

 **response**

    HTTP/1.1 200 OK
    Date: Thu, 05 May 2011 18:16:22 GMT
    Server: journey/0.4.0
    Connection: close
    Transfer-Encoding: chunked

##Package.json settings

Haibu uses a package.json format extension in order to determine what to deploy.
Also, haibu is a pull based server; this means that it will pull files from outside of the server in order to deploy instead of using uploading directly into the process.

###Name

The name attribute is required and will represent the name of the application being deployed.

```json
{
  "name": "app-name"
}
```

###User

The user attribute is required and will represent the user who started up a drone.

```json
{
  "user": "myusername"
}
```

###Repositories

#### git

This type of repository will pull a git repository into haibu and deploy its contents.

```json
{
  "repository": {
    "type": "git",
    "url": "http://path/to/git/server"
  }
}
```

#### local

This type of repository will pull a directory relative to the `haibu` and deploy its contents.

```json
{
  "repository": {
    "type": "local",
    "directory": "/path/to/application"
  }
}
```

#### tar

This type of repository will pull a remote archive relative to the `haibu` and deploy its contents.

```json
{
  "repository": {
    "type": "tar",
    "url": "http://path/to/archive.tar"
  }
}
```

#### zip

This type of repository will pull a remote archive relative to the `haibu` and deploy its contents.

```json
{
  "repository": {
    "type": "zip",
    "url": "http://path/to/archive.zip"
  }
}
```

#### npm

This type of repository will install a npm package as application. The package will be available as directory under its name and the scripts will be installed in the `.bin` directory.
So scripts.start should have one of both as relative directory:

```json
"scripts": {
  "start": ".bin/server.js"
}
```

or:

```json
"scripts": {
  "start": "name of npm package/server.js"
}
```

```json
{
  "repository": {
    "type": "npm",
    "package": "name of npm package"
  }
}
```

## Run Tests
All of the `haibu` tests are written in [vows][0], and cover all of the use cases described above.

``` bash
  $ npm test
```

If you wish to take advantage of all of the configuration offered in `haibu` through `flatiron` see the sample [test-config.json.example][2] configuration file.

*If you copy and paste the above link, the test suite will attempt to connect to Rackspace for some of the remote file tests. You don't need to run these tests or use Rackspace to get started. We'll be improving our test runner soon to help make this process a bit more intuitive.*

## FAQ

### `jitsu` is not working with `haibu`

`jitsu` is intended to work with the full production stack at Nodejitsu and should not be used with `haibu`.


#### Author: [Nodejitsu Inc.](http://www.nodejitsu.com)

[0]: http://vowsjs.org
[1]: http://github.com/nodejitsu/node-http-proxy
[2]: https://github.com/nodejitsu/haibu/tree/master/test/fixtures/test-config.json.example
