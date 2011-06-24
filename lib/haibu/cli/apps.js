var haibu = require('../../../');
var winston = require('winston');
var colors = require('colors');
var eyes = require('eyes');
var fs = require('fs');

module.exports = function setupApps(app) {
  app.usage('/apps',function config(req,res) {
    res.info('');
    res.info('haibu apps'.bold.underline);
    res.info('  Actions related to haibu application deployments.');
    res.info('');
    res.info('notes'.bold);
    res.info('  these commands may be accessed without the `apps` prefix');
    res.info('');
    res.info('commands'.bold);
    res.info('  haibu apps clean'.green + ' <appname>'.yellow);
    res.info('  haibu apps list'.green);
    res.info('  haibu apps start'.green);
    res.info('  haibu apps stop'.green + ' <appname>'.yellow);
    res.info('');
    res.info('flags'.bold);
    res.info('  -c --conf [.haibuconf]     The file to use as our configuration');
    res.info('  -f --file [package.json]   The file that is our deployment instructions');
    res.info('');
  });

  app.cli(['/clean','/clean/:appname','/apps/clean','/apps/clean/:appname'],function appsClean(req,res) {
    var app = req.app;
    app.name = req.params.appname || req.app.name;

    req.client.clean(app, function (err, result) {
      if (err) {
        res.error('Error cleaning app: ' + app.name);
        return eyes.inspect(err);
      }

      res.info('Successfully cleaned app: ' + app.name.yellow);
    });
  });
  app.usage(['/clean','/apps/clean'],function appsCleanUsage(req,res) {
    res.info('');
    res.info('haibu apps clean'.green + ' <appname>'.yellow);
    res.info('  Removes all traces of an application from the server');
    res.info('  See `haibu apps -h` for more details');
    res.info('');
    res.info('params'.bold);
    res.info('  appname [deployment script value]     name of the application');
  });

  app.cli(['/start','/apps/start'],function appsStart(req,res) {
    var app = req.app;

    req.client.start(app, function (err, result) {
      if (err) {
        res.error('Error starting app: ' + app.name);
        return eyes.inspect(err);
      }

      res.info('Successfully started app: ' + app.name.yellow + ' on ' +
                      (result.drone.host + ':' + result.drone.port).green
                  );
    });
  });
  app.usage(['/start','/apps/start'],function appsStartUsage(req,res) {
    res.info('');
    res.info('haibu apps start'.green);
    res.info('  Starts and deploys if necessary an application from the server');
    res.info('  See `haibu apps -h` for more details');
    res.info('');
  });

  app.cli(['/stop','/stop/:appname','/apps/stop','/apps/stop/:appname'],function appsStop(req,res) {
    var app = req.app;
    app.name = req.params.appname || app.name;

    req.client.stop(app.name, function (err, result) {
      if (err) {
        res.error('Error stopping app: ' + app.name);
        return eyes.inspect(err);
      }

      res.info('Successfully stopped app: ' + app.name.yellow);
    });
  });
  app.usage(['/stop','/apps/stop'],function appsStopUsage(req,res) {
    res.info('');
    res.info('haibu apps stop'.green + ' <appname>'.yellow);
    res.info('  Stops all drones of an application from the server');
    res.info('  See `haibu apps -h` for more details');
    res.info('');
    res.info('params'.bold);
    res.info('  appname [deployment script value]     name of the application');
  });

  app.cli(['/list','/apps/list'],function appsList(req,res) {
    var pattern = req.params.pattern;

    req.client.get('', function (err, result) {
      if (err) {
        res.error('Error listing applications');
        return eyes.inspect(err);
      }

      var appDrones = result.drones,
          rows = [['app', 'domains', 'address']],
          colors = ['yellow', 'red', 'magenta'],
          regexp;

      if (pattern) {
        regexp = new RegExp(pattern, 'i');
      }

      for(var app in appDrones) {
        var appInfo = appDrones[app].app;
        var drones = appDrones[app].drones;
        drones.forEach(function(drone) {
          if (!regexp || (regexp && regexp.test(server.role))) {
            rows.push([
              app,
              appInfo.domain || appInfo.domains.map(function(item){if(!item) {return 'undefined'.blue}; return item;}).join(' & '),
              drone.host + ':' + drone.port
            ]);
          }
        });
      }
      if (rows.length === 1) {
        res.info("No applications found.");
        return;
      }

      res.info('Applications:');
      haibu.log.putRows('data', rows, colors);
    });
  });
  app.usage(['/list','/apps/list'],function appsListUsage(req,res) {
    res.info('');
    res.info('haibu apps list'.green + ' [pattern]'.yellow);
    res.info('  Lists all the applications running on the server');
    res.info('  See `haibu apps -h` for more details');
    res.info('');
    res.info('params'.bold);
    res.info('  pattern - simple regexp to filter names');
  });
}
