# haibu 

       _               _   _             
      | |             (_) | |            
      | |__    _____   _  | |__    _   _ 
      |  _ \  (____ | | | |  _ \  | | | |
      | | | | / ___ | | | | |_) ) | |_| |
      |_| |_| \_____| |_| |____/  |____/ 


*spawn your own node.js clouds, on your own hardware*


# What is haibu?

haibu is the open-source [node.js](http://nodejs.org) project for spawning and managing several node.js applications on a single server. It's an integral part of [Nodejitsu's](http://nodejitsu.com) production stack and is fully supported by a dedicated team of core node.js developers.

# How does it work?

haibu (  which is Japanese for "hive" ) transforms node.js applications ( using a [Carapace](https://github.com/nodejitsu/haibu/blob/master/bin/carapace) ) into "drones". This approach allows haibu to directly interact with node.js applications and add all sorts of additional functionality. haibu also contains a plugin system, so you can easily add even more functionality without needing to dive too far into the codebase. 

haibu builds on this concept of "drones" and exposes a robust and granular API for interacting with your node.js applications. haibu's API is exposed as a node.js client wrapper AND a RESTFul HTTP webservice. This means that you can use haibu both programmatically as a node.js module OR startup a "haibu server" and communicate with it using simple RESTFul HTTP requests. 

## Where can I run haibu?

haibu doesn't discriminate. If your environment supports node.js, you can install haibu and start up your own node.js cloud. This makes haibu an ideal tool for both development purposes and production usage since you can seamlessly setup haibu on your local machine, on utility computing providers ( such as Amazon EC2 or Rackspace ), on dedicated servers, or even on a mobile phone!

# Installation

    [sudo] npm install haibu -g

# Documentation

haibu's documentation is still very much a work in progress. We'll be actively updating the documentation in the upcoming weeks to make it easier to get acclimated with haibu. Aside from the overview provided in this ReadMe file, haibu uses docco and literate style programming to provide comprehensive source code documentation. Check out the /docs/ folder for more information.

# An overview of using haibu

## The node.js API wrapper

Allows you to call haibu programmatically from inside your node.js scripts. ( From: /examples/hello-spawn.js )

      var eyes = require('eyes'),
          haibu = require('haibu');

      // Create a new client for communicating with the haibu server
      var client = new haibu.drone.Client({
        host: 'localhost',
        port: 9002
      });

      // A basic package.json for a node.js application on Haibu
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


## The RESTful Webservice

Allows you to call haibu via a RESTful JSON API. This is ideal for situations where you need to integrate haibu with third party systems or you need to communicate with haibu over the network.


**Starts up a haibu webserver**

     [sudo] node bin/haibu-server

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

# haibu API

Documentation coming soon...

## Run Tests
All of the `haibu` tests are written in [vows][0], and cover all of the use cases described above.
<pre>
  sudo vows test/**/*-test.js --spec
</pre>

#### Author: [Nodejitsu Inc.](http://www.nodejitsu.com)

[0]: http://vowsjs.org