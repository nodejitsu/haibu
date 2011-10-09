/*
 * service.js: RESTful JSON-based web service for the drone module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var journey = require('journey'),
    haibu = require('../../haibu');

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
  // Create the Router instance.
  var router = new(journey.Router)({
    strict: false,
    strictUrls: false,
    api: 'basic',
    ignoreCase: true
  });

  //
  // ### Default Root
  // `GET /` responds with default JSON message
  //
  router.root.bind(function (response) {
    response.send(400, {}, { message: 'No drones specified' });
  });

  //
  // ### Version Binding
  // `GET /version` returns the version string for this webservice
  //
  // TODO (indexzero): Consume `haibu.version` instead of journey.
  //
  router.get(/\/version[\/]?/).bind(function (response) {
    response.send(200, {}, { version: journey.version.join('.') });
  });

  router.path('/config', haibu.config.addRoutes());

  //
  // ### Drones Resource
  // Routes for RESTful access to the Drone resource.
  //
  router.path('/drones', function () {
    //
    // ### List Drones
    // `GET /drones` returns list of all drones managed by the
    // Drone associated with this router.
    //
    this.get().bind(function (response) {
      var data = { drones: drone.list() };
      response.send(200, {}, data);
    });

    //
    // ### Show Drone
    // `GET /drones/:id` shows details of a drone managed by the
    // Drone associated with this router.
    //
    this.get(/\/([\w|\-]+)/).bind(function (response, id) {
      var data = drone.show(id);
      if (typeof data === 'undefined') {
        response.send(404, {}, { message: 'No drone(s) found for application ' + id });
      }
      else {
        response.send(200, {}, data);
      }
    });

    //
    // ### Start Drone
    // `POST /drone/:id/start` starts a new drone for app with :id on this server.
    //
    this.post(/\/([\w\-\.]+)\/start/).bind(function (response, id, data) {
      drone.start(data.start, function (err, result) {
        if (err) {
          haibu.emit('error:service', 'error', err);
          return response.send(500, {}, { error: err });
        }

        response.send(200, {}, { drone: result });
      });
    });

    //
    // ### Stop Drone
    // `POST /drone/:id/stop` stops all drones for app with :id on this server.
    //
    this.post(/\/([\w\-\.]+)\/stop/).bind(function (response, id, data) {
      drone.stop(data.stop.name, function (err, result) {
        if (err || !result) {
          err = err || new Error('Unknown error from drone.');
          haibu.emit('error:service', 'error', err);
          return response.send(500, {}, { error: err });
        }

        response.send(200);
      });
    });

    //
    // ### Restart Drone
    // `POST /drone/:id/restart` restarts all drones for app with :id on this server.
    //
    this.post(/\/([\w\-\.]+)\/restart/).bind(function (response, id, data) {
      drone.restart(data.restart.name, function (err, drones) {
        if (err) {
          haibu.emit('error:service', 'error', err);
          return response.send(500, {}, { error: err });
        }

        response.send(200, {}, { drones: drones });
      });
    });

    //
    // ### Clean Drone
    // `POST /drones/:id/clean` removes all of the dependencies and source files for
    // the app with :id on this server.
    //
    this.post(/\/([\w\-\.]+)\/clean/).bind(function (response, id, data) {
      drone.clean(data, function (err, drones) {
        if (err) {
          haibu.emit('error:service', 'error', err);
          return response.send(500, {}, { error: err });
        }

        response.send(200, {}, { clean: true });
      });
    });

    //
    // ### Update Drone
    // `POST /drones/:id/update` cleans and starts
    // the app with :id on this server.
    //
    this.post(/\/([\w\-\.]+)\/update/).bind(function (response, id, data) {
      drone.update(data, function (err, drones) {
        if (err) {
          haibu.emit('error:service', 'error', err);
          return response.send(500, {}, { error: err });
        }

        response.send(200, {}, { update: true });
      });
    });

    //
    // ### Clean Drone
    // `POST /drones/cleanall` removes all of the dependencies and source files for
    // all apps on this server.
    //
    this.post(/\/cleanall/).bind(function (response) {
      drone.cleanAll(function (err, drones) {
        if (err) {
          haibu.emit('error:service', 'error', err);
          return response.send(500, {}, { error: err });
        }

        response.send(200, {}, { clean: true });
      });
    });
  });

  return router;
};
