module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    lint: {
      all: ['grunt.js', 'lib/**/*.js']
    },
    jshint: {
      options: {
      }
    }
  });

  // Default task.
  grunt.registerTask('default', 'lint');

};