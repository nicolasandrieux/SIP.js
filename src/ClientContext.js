var OutgoingRequest = require('./SIPMessage/OutgoingRequest');
var EventEmitter = require('./EventEmitter');
var RequestSender = require('./RequestSender');
var Utils = require('./Utils');
var C = require('./Constants');

var ClientContext = module.exports = function (ua, method, target, options) {
  var params, extraHeaders,
      originalTarget = target,
      events = [
        'progress',
        'accepted',
        'rejected',
        'failed',
        'cancel'
      ];

  if (target === undefined) {
    throw new TypeError('Not enough arguments');
  }

  // Check target validity
  target = ua.normalizeTarget(target);
  if (!target) {
    throw new TypeError('Invalid target: ' + originalTarget);
  }

  this.ua = ua;
  this.logger = ua.getLogger('sip.clientcontext');
  this.method = method;

  params = options && options.params;
  extraHeaders = (options && options.extraHeaders || []).slice();

  if (options && options.body) {
    this.body = options.body;
  }
  if (options && options.contentType) {
    this.contentType = options.contentType;
    extraHeaders.push('Content-Type: ' + this.contentType);
  }

  this.request = new OutgoingRequest(this.method, target, this.ua, params, extraHeaders);

  this.localIdentity = this.request.from;
  this.remoteIdentity = this.request.to;

  if (this.body) {
    this.request.body = this.body;
  }

  this.data = {};

  this.initEvents(events);
};
ClientContext.prototype = new EventEmitter();

ClientContext.prototype.send = function () {
  (new RequestSender(this, this.ua)).send();
  return this;
};

ClientContext.prototype.cancel = function (options) {
  options = options || {};

  var cancel_reason = Utils.getCancelReason(options.status_code, options.reason_phrase);
  this.request.cancel(cancel_reason);

  this.emit('cancel');
};

ClientContext.prototype.receiveResponse = function (response) {
  var cause = Utils.getReasonPhrase(response.status_code);

  switch(true) {
    case /^1[0-9]{2}$/.test(response.status_code):
      this.emit('progress', response, cause);
      break;

    case /^2[0-9]{2}$/.test(response.status_code):
      if(this.ua.applicants[this]) {
        delete this.ua.applicants[this];
      }
      this.emit('accepted', response, cause);
      break;

    default:
      if(this.ua.applicants[this]) {
        delete this.ua.applicants[this];
      }
      this.emit('rejected', response, cause);
      this.emit('failed', response, cause);
      break;
  }

};

ClientContext.prototype.onRequestTimeout = function () {
  this.emit('failed', null, C.causes.REQUEST_TIMEOUT);
};

ClientContext.prototype.onTransportError = function () {
  this.emit('failed', null, C.causes.CONNECTION_ERROR);
};
