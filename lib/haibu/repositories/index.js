/*
 * index.js: Top-level include for the repository module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var haibu = require('../../haibu');

//
// ### Export Components
// Export relevant components of the repositories module
//
exports.Repository = require('./repository').Repository;

// Fill repos store with known repository types
var repos = {
  git:   require('./git').Git,
  local: require('./local-file').LocalFile,
  npm:   require('./npm').Npm,
  tar:   require('./tar').Tar,
  zip:   require('./zip').Zip
};

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
  exports.validate(app);

  var type = typeof app.repository.type === 'string' ? app.repository.type.toLowerCase() : '';

  if (type === '' || !repos[type]) {
    var err = new Error('Cannot create repository for unknown type ' + type);
    err.blame = {
      type: 'user',
      message: 'Repository configuration specified unknown type of repository'
    }
    throw err;
  }

  haibu.emit('repository:create', 'info', {
    type: type,
    app: app.name,
    user: app.user
  });

  return new (repos[type])(app, options);
};

//
// ### function add (name, class)
// #### @name {String} Name of the repository to add
// #### @constructor {Function} Constructor of the repository instance to create
// Adds a new repository constructor to the repository list
//
exports.add = function (name, constructor) {
  if (repos[name]) {
    var err = new Error('A repository type with this name (' + name + ') already exists!');
    err.blame = {
      type: 'user',
      message: 'Repository already exists'
    }
    throw err;
  }

  repos[name] = constructor;
};

//
// ### function remove (name)
// #### @name {String} Name of the repository to remove
// Removes a repository constructor from the repository list
//
exports.remove = function (name) {
  if (!repos[name]) {
    var err = new Error('A repository type with this name (' + name + ') does not exists!');
    err.blame = {
      type: 'user',
      message: 'Repository already exists'
    }
    throw err;
  }

  delete repos[name];
};

//
// ### function list ()
// Lists all repository types names in the repository list. Returns array of names.
//
exports.list = function () {
  return Object.keys(repos);
};

//
// ### function validate (pkg)
// #### @pkg {Object} The package.json manifest to validate
// Validates the package.json manifest for the basic haibu usage.
//
exports.validate = function (pkg) {
  return exports.Repository.prototype.validate([], pkg);
};