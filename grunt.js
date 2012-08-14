module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    lint: {
      all: ['grunt.js', 'lib/**/*.js']
    },
    jshint: {
      options: {
        laxbreak: true,
        node: true
      }
    }
  });

  // Default task.
  grunt.registerTask('default', 'lint');

};