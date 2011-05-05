# haibu 

       _               _   _             
      | |             (_) | |            
      | |__    _____   _  | |__    _   _ 
      |  _ \  (____ | | | |  _ \  | | | |
      | | | | / ___ | | | | |_) ) | |_| |
      |_| |_| \_____| |_| |____/  |____/ 


*spawn your own node.js clouds, on your own hardware*


# what is haibu?

haibu is the open-source node.js project for spawning and managing several node.js applications on a single cloud. It's an integral part of Nodejitsu's production stack and is fully supported by a dedicated team of core node.js developers. 

## How does it work?

haibu ( Japanese for "hive" ) is a node.js module that has a robust API for managing everything you'd ever want to do when running node.js applications ( drones ). haibu has baked in functionality for: x, y, z. It also features a plugin system for adding any additional functionality you need without needing to dive too far into the codebase.

## Where does haibu start up node.js clouds?

haibu doesn't discriminate. If your environment supports node.js, you can install haibu and start up your own node.js cloud. This makes haibu an ideal tool for both development purposes and production usage since you can seamlessly setup haibu on your local machine, on EC2, on Rackspace, on dedicated hardware, or even on a mobile phone!

# Installation

    [sudo] npm install haibu -g

## Run Tests
All of the `haibu` tests are written in [vows][0], and cover all of the use cases described above.
<pre>
  sudo vows test/**/*-test.js --spec
</pre>


## Configuration

Haibu requires a configuration file to maintain your username and api key. You can find an example file at /config/auth.json.example

#### Author: [Nodejitsu Inc.](http://www.nodejitsu.com)

[0]: http://vowsjs.org