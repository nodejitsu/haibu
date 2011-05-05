/*
 * index.js: Top-level include for the repository module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var Git = require('./git').Git,
    Npm = require('./npm').Npm,
    Tar = require('./tar').Tar,
    Zip = require('./zip').Zip,
    LocalFile = require('./local-file').LocalFile;

//
// ### Export Components
// Export relevant components of the repositories module
//
exports.Repository = require('./repository').Repository;

//
// ### function create (app, options)
// #### @app {Object} The application to create the repository for
// #### @options {Object} Options to pass along to the repository
// Creates a repository for the specified application by switching
// off `app.repository.type' in the application package.json manifest. 
//
exports.create = function (app, options) {
  //
  // Perform validation on app before we attempt to create a repository 
  //
  var validate = exports.validate(app), factory, type;
  if (!validate.valid) {
    throw new Error(JSON.stringify(validate.errors));
  }
  
  factory = {
    git: function () {
      return new Git(app, options);
    },
    npm: function () {
      return new Npm(app, options);
    },
    tar: function () {
      return new Tar(app, options);
    },
    zip: function () {
      return new Zip(app, options);
    },
    local: function () {
      return new LocalFile(app, options);
    }
  };
  
  type = app.repository.type.toLowerCase();
  if (factory[type]) {
    return factory[type]();
  }
  else {
    throw new Error('Cannot create repository for unknown type ' + type);
  }
};

//
// ### function validatePackage (pkg)
// #### @pkg {Object} The package.json manifest to validate
// Validates the package.json manifest for the basic haibu usage.
//
exports.validate = function (pkg) {
  function invalid (prop) {
    return {
      errors: {
        property: prop,
        message: 'Property ' + prop + ' is required'
      }
    };
  }
  
  //
  // Check for the basic required properties needed for haibu 
  //
  var i, required = ['name', 'user', 'repository', 'scripts'];
  for (i = 0; i < required.length; i++) {
    if (!pkg[required[i]]) {
      return invalid(required[i]);
    }
  }
  
  // Check for repository.type
  if (!pkg.repository.type) {
    return invalid('repository.type');
  }
  
  // Check for scripts.start  
  if (!pkg.scripts.start) {
    return invalid('scripts.start');
  }
  
  return {
    valid: true
  };
};
