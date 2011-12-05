/*
 * service.js: RESTful JSON-based web service for the drone module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var haibu = require('../../haibu');

//
// ### function createRouter (dron, logger)
// #### @drone {Drone} Instance of the Drone resource to use in this router.
//
// Creates the Journey router which represents the `haibu` Drone webservice.
//
exports.createRouter = function (drone) {
  //
  // TODO (indexzero): Setup token-based auth for Drone API servers
  //
  haibu.router.strict = false;
  
  //
  // ### Default Root
  // `GET /` responds with default JSON message
  //
  haibu.router.get('/', function () {
    this.res.json(400, { message: 'No drones specified' });
  });

  //
  // ### Version Binding
  // `GET /version` returns the version string for this webservice
  //
  haibu.router.get(/\/version/, function () {
    this.res.json(200, { version: 'haibu ' + haibu.version });
  });
  
  haibu.router.post(/\/deploy\/([\w\-\.]+)\/([\w\-\.]+)/, { stream: true }, function (userId, appId) {
    var res = this.res;
    
    drone.deploy(userId, appId, this.req, function (err, result) {
      if (err) {
        haibu.emit(['error', 'service'], 'error', err);
        return res.json(500, { error: err });
      }

      res.json(200, { drone: result });
    })
  });
  

  //
  // ### Drones Resource
  // Routes for RESTful access to the Drone resource.
  //
  haibu.router.path('/drones', function () {
    //
    // ### List Apps
    // `GET /drones` returns list of all drones managed by the
    // Drone associated with this router.
    //
    this.get(function () {
      var res = this.res,
          data = { drones: drone.list() };
          
      res.json(200, data);
    });
    
    //
    // ### List Drone Processes
    // `GET /drones/running` returns with a list of formatted
    // drone processes.
    //
    this.get(/\/running/, function () {
      this.res.json(200, drone.running());
    });

    //
    // ### Show App
    // `GET /drones/:id` shows details of a drone managed by the
    // Drone associated with this router.
    //
    this.get(/\/([\w\-\.]+)/, function (id) {
      var data = drone.show(id);
      if (typeof data === 'undefined') {
        this.res.json(404, { message: 'No drone(s) found for application ' + id });
      }
      else {
        this.res.json(200, data);
      }
    });

    //
    // ### Start Drone for App
    // `POST /drone/:id/start` starts a new drone for app with :id on this server.
    //
    this.post(/\/([\w\-\.]+)\/start/, function (id) {
      var res = this.res;
      
      drone.start(this.req.body.start, function (err, result) {
        if (err) {
          haibu.emit(['error', 'service'], 'error', err);
          return res.json(500, { error: err });
        }

        res.json(200, { drone: result });
      });
    });

    //
    // ### Stop Drone for App
    // `POST /drone/:id/stop` stops all drones for app with :id on this server.
    //
    this.post(/\/([\w\-\.]+)\/stop/, function (id) {
      var res = this.res;
      
      drone.stop(this.req.body.stop.name, function (err, result) {
        if (err || !result) {
          err = err || new Error('Unknown error from drone.');
          haibu.emit('error:service', 'error', err);
          return res.json(500, { error: err });
        }

        res.json(200);
      });
    });

    //
    // ### Restart Drone for App
    // `POST /drone/:id/restart` restarts all drones for app with :id on this server.
    //
    this.post(/\/([\w\-\.]+)\/restart/, function (id) {
      var res = this.res;
      
      drone.restart(this.req.body.restart.name, function (err, drones) {
        if (err) {
          haibu.emit(['error', 'service'], 'error', err);
          return res.json(500, { error: err });
        }

        res.json(200, { drones: drones });
      });
    });

    //
    // ### Clean Drone for App
    // `POST /drones/:id/clean` removes all of the dependencies and source files for
    // the app with :id on this server.
    //
    this.post(/\/([\w\-\.]+)\/clean/, function (id) {
      var res = this.res;
      
      drone.clean(this.req.body, function (err, drones) {
        if (err) {
          haibu.emit('error:service', 'error', err);
          return res.json(500, { error: err });
        }

        res.json(200, { clean: true });
      });
    });

    //
    // ### Update Drone for App
    // `POST /drones/:id/update` cleans and starts
    // the app with :id on this server.
    //
    this.post(/\/([\w\-\.]+)\/update/, function (id) {
      var res = this.res;
      
      drone.update(this.req.body, function (err, drones) {
        if (err) {
          haibu.emit('error:service', 'error', err);
          return res.json(500, { error: err });
        }

        res.json(200, { update: true });
      });
    });

    //
    // ### Clean All Drones
    // `POST /drones/cleanall` removes all of the dependencies and source files for
    // all apps on this server.
    //
    this.post(/\/cleanall/, function (response) {
      var res = this.res;
      
      drone.cleanAll(function (err, drones) {
        if (err) {
          haibu.emit('error:service', 'error', err);
          return res.json(500, { error: err });
        }

        res.json(200, { clean: true });
      });
    });
  });
};
