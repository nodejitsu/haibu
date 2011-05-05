# haibu 

       _               _   _             
      | |             (_) | |            
      | |__    _____   _  | |__    _   _ 
      |  _ \  (____ | | | |  _ \  | | | |
      | | | | / ___ | | | | |_) ) | |_| |
      |_| |_| \_____| |_| |____/  |____/ 


*spawn your own node.js clouds, on your own hardware*


# What is haibu?

haibu is the open-source node.js project for spawning and managing several node.js applications on a single cloud. It's an integral part of Nodejitsu's production stack and is fully supported by a dedicated team of core node.js developers.

# How does it work?

haibu (  which is Japanese for "hive" ) transforms node.js applications ( using a Carapace ) into "drones". This process allows haibu to directly interact with node.js applications and add all sorts of additional functionality. haibu contains a plugin system so you can easily add even more functionality without needing to dive too far into the codebase. 

haibu builds on this concept of "drones" and exposes a robust and granular API for interacting with your drones. This API is exposed both through Node.js and a RESTFul HTTP webservice. This means that you can use haibu both programmatically as a node.js module or startup a "haibu server" and interfact it with it using simple RESTFul HTTP requests. 

## Where does haibu start up node.js clouds?

haibu doesn't discriminate. If your environment supports node.js you can install haibu and start up your own node.js cloud. This makes haibu an ideal tool for both development purposes and production usage since you can seamlessly setup haibu on your local machine, on utility computing providers ( such as Amazon EC2 or the Rackspace ), on dedicated servers, or even on a mobile phone!

# Installation

    [sudo] npm install haibu -g

## Run Tests
All of the `haibu` tests are written in [vows][0], and cover all of the use cases described above.
<pre>
  sudo vows test/**/*-test.js --spec
</pre>

# An overview of using haibu

## The node.js API wrapper

Allows you to call haibu programmatically from inside your node.js scripts. 

**require haibu in your node.js script**

    var haibu = require('haibu');

**Start an application programmatically** 

    TODO: add example code

## The RESTful Webservice

Allows you to call haibu via a RESTful JSON API. This is ideal for situations where you need to integrate haibu with third party systems or you need to communicate with haibu over the network.


**Starts up a haibu webserver**

     [sudo] node bin/haibu-server

**Start an application through the webservice**

Once you have started up haibu as a webservice you can perform RESTful commands against it to execute any of haibu's API, such as starting and stopping applications. 

# haibu API


## Configuration

Haibu requires a configuration file to maintain your username and api key. You can find an example file at /config/auth.json.example

### Contributing 

#### Author: [Nodejitsu Inc.](http://www.nodejitsu.com)

[0]: http://vowsjs.org