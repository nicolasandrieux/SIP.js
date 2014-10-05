var SIPPromise = require('./');

module.exports = function addPromise (f, thisArg, length) {
  var callbacksIndex = (length || f.length) - 2;
  return function withPromise () {
    var nonCallbacks = [].slice.call(arguments, 0, callbacksIndex);
    var bound = f.bind.apply(f, [thisArg].concat(nonCallbacks));
    var promise = new SIPPromise(bound);
    var callbacks = [].slice.call(arguments, callbacksIndex);
    if (callbacks.length) {
      promise.then.apply(promise, callbacks);
    }
    return promise;
  };
};
