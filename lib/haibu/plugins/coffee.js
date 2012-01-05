var coffee = exports;

coffee.name = 'coffee';

coffee.init = function (done) {
  done();
};

coffee.attach = function attach(options) {
}

coffee.argv = function argv(repo) {
  if (repo.executable === 'coffee') {
    return {
      argv: ['--plugin', 'coffee', '--coffee', 'true']
    }
  }
  return {
    argv: ['--plugin', 'coffee']
  }
}