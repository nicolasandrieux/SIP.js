var SIPPromise = require('./');

module.exports = function defer () {
  var deferred = {};
  deferred.promise = new SIPPromise(function (resolve, reject) {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
};
