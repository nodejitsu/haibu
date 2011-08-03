/*
 * apps.js: Commands for the `apps` resource in the haibu CLI.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */
 
var fs = require('fs'),
    colors = require('colors'),
    eyes = require('eyes'),
    winston = require('winston'),
    haibu = require('../../../');

module.exports = function setupApps (app) {
  app.usage('/apps', function config (cmd, tty) {
    tty.info('');
    tty.info('haibu apps'.bold.underline);
    tty.info('  Actions related to haibu application deployments.');
    tty.info('');
    tty.info('notes'.bold);
    tty.info('  these commands may be accessed without the `apps` prefix');
    tty.info('');
    tty.info('commands'.bold);
    tty.info('  haibu apps clean'.green + ' <appname>'.yellow);
    tty.info('  haibu apps list'.green);
    tty.info('  haibu apps start'.green);
    tty.info('  haibu apps stop'.green + ' <appname>'.yellow);
    tty.info('');
    tty.info('flags'.bold);
    tty.info('  -c --conf [.haibuconf]     The file to use as our configuration');
    tty.info('  -f --file [deploy.json]   The file that is our deployment instructions');
    tty.info('');
  });

  app.cli(['/clean', '/clean/:appname', '/apps/clean', '/apps/clean/:appname'], function appsClean (cmd, tty) {
    var app = cmd.app;
    app.name = cmd.params.appname || cmd.app.name;

    cmd.client.clean(app, function (err, result) {
      if (err) {
        tty.error('Error cleaning app: ' + app.name);
        return eyes.inspect(err);
      }

      tty.info('Successfully cleaned app: ' + app.name.yellow);
    });
  });
  app.usage(['/clean', '/apps/clean'], function appsCleanUsage (cmd, tty) {
    tty.info('');
    tty.info('haibu apps clean'.green + ' <appname>'.yellow);
    tty.info('  Removes all traces of an application from the server');
    tty.info('  See `haibu apps -h` for more details');
    tty.info('');
    tty.info('params'.bold);
    tty.info('  appname [deployment script value]     name of the application');
  });

  app.cli(['/start', '/apps/start'], function appsStart (cmd, tty) {
    var app = cmd.app;
    cmd.client.start(app, function (err, result) {
      if (err) {
        tty.error('Error starting app: ' + app.name);
        return eyes.inspect(err);
      }

      tty.info('Successfully started app: ' + app.name.yellow + ' on ' +
                      (result.drone.host + ':' + result.drone.port).green
                  );
    });
  });
  app.usage(['/start', '/apps/start'], function appsStartUsage (cmd, tty) {
    tty.info('');
    tty.info('haibu apps start'.green);
    tty.info('  Starts and deploys if necessary an application from the server');
    tty.info('  See `haibu apps -h` for more details');
    tty.info('');
  });

  app.cli(['/stop', '/stop/:appname', '/apps/stop', '/apps/stop/:appname'], function appsStop (cmd, tty) {
    var app = cmd.app;
    app.name = cmd.params.appname || app.name;

    cmd.client.stop(app.name, function (err, result) {
      if (err) {
        tty.error('Error stopping app: ' + app.name);
        return eyes.inspect(err);
      }

      tty.info('Successfully stopped app: ' + app.name.yellow);
    });
  });
  app.usage(['/stop', '/apps/stop'], function appsStopUsage (cmd, tty) {
    tty.info('');
    tty.info('haibu apps stop'.green + ' <appname>'.yellow);
    tty.info('  Stops all drones of an application from the server');
    tty.info('  See `haibu apps -h` for more details');
    tty.info('');
    tty.info('params'.bold);
    tty.info('  appname [deployment script value]     name of the application');
  });

  app.cli(['/list', '/apps/list'], function appsList (cmd, tty) {
    var pattern = cmd.params.pattern;

    cmd.client.get('', function (err, result) {
      if (err) {
        tty.error('Error listing applications');
        return eyes.inspect(err);
      }

      var appDrones = result.drones,
          rows = [['app', 'domains', 'address']],
          colors = ['yellow', 'red', 'magenta'],
          regexp;

      if (pattern) {
        regexp = new RegExp(pattern, 'i');
      }

      for (var app in appDrones) {
        var appInfo = appDrones[app].app;
        var drones = appDrones[app].drones;
        drones.forEach(function (drone) {
          if (!regexp || (regexp && regexp.test(server.role))) {
            rows.push([
              app,
              (appInfo.domains || [appInfo.domain]).map(function (item) {
                return item ? item : 'undefined'.blue;
              }).join(' & '),
              drone.host + ':' + drone.port
            ]);
          }
        });
      }
      if (rows.length === 1) {
        tty.info("No applications found.");
        return;
      }

      tty.info('Applications:');
      haibu.log.putRows('data', rows, colors);
    });
  });
  app.usage(['/list', '/apps/list'], function appsListUsage (cmd, tty) {
    tty.info('');
    tty.info('haibu apps list'.green + ' [pattern]'.yellow);
    tty.info('  Lists all the applications running on the server');
    tty.info('  See `haibu apps -h` for more details');
    tty.info('');
    tty.info('params'.bold);
    tty.info('  pattern - simple regexp to filter names');
  });
}
