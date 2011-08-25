/*
 * index-test.js: Tests for top level utility module.
 *
 * 
 *
 */


var assert = require('assert'),
    vows = require('vows'),
    utils = require('../../lib/haibu/utils/index');

buildValidatingContext = function() {
  
  thrownOn = function () {
      var context = {
          topic: function () {
              malformed_url_field = 'some_mal' + this.context.name + 'formed/url/field.com'
              return malformed_url_field
          }
      };

      context['should throw with the given validation error'] = function(field) {
        assert.throws(function() { utils.validateForShell({'The url field is unsafe': field}) },
                      function(err) { return err.message == 'The url field is unsafe: ' + field }
        )
      }

      return context;
  }
  
  shell_operators = ['..', './', '&', '&&', '|', '||',  '>', '>>', '<', '<<', ';', '%ENVAR%', '$']
  var shell_context = {}
  shell_operators.forEach(function(operator) {
    shell_context[operator] = thrownOn()
  })
  return shell_context;
}

vows.describe('Shell validator').addBatch({
  'When given an error/value object' : {
    'with a malformed field contatining an unsafe shell operator' : buildValidatingContext(),

    'with well-fromed field' : {
      topic: function() {
        dir_field = 'some/well/formed/directory/field'
        return dir_field
      },
      'should not throw with the given validation error' : function(field) {
        assert.doesNotThrow(function() { utils.validateForShell({'The directory field is unsafe': field}) })
      }
    }
  }
}).export(module)
