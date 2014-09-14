var C = require('./Constants');
var Transactions = require('./Transactions');
var EventEmitter = require('./EventEmitter');
var Utils = require('./Utils');

var ServerContext = module.exports = function (ua, request) {
  var events = [
      'progress',
      'accepted',
      'rejected',
      'failed'
    ];
  this.ua = ua;
  this.logger = ua.getLogger('sip.servercontext');
  this.request = request;
  if (request.method === C.INVITE) {
    this.transaction = new Transactions.InviteServerTransaction(request, ua);
  } else {
    this.transaction = new Transactions.NonInviteServerTransaction(request, ua);
  }

  if (request.body) {
    this.body = request.body;
  }
  if (request.hasHeader('Content-Type')) {
    this.contentType = request.getHeader('Content-Type');
  }
  this.method = request.method;

  this.data = {};

  this.localIdentity = request.to;
  this.remoteIdentity = request.from;

  this.initEvents(events);
};

ServerContext.prototype = new EventEmitter();

function replyHelper (options, defaultCode, minCode, maxCode, events) {
  options = options || {};
  var
    statusCode = options.statusCode || defaultCode,
    reasonPhrase = Utils.getReasonPhrase(statusCode, options.reasonPhrase),
    extraHeaders = (options.extraHeaders || []).slice(),
    body = options.body,
    response;

  if (statusCode < minCode || statusCode > maxCode) {
    throw new TypeError('Invalid statusCode: ' + statusCode);
  }
  response = this.request.reply(statusCode, reasonPhrase, extraHeaders, body);
  events.forEach(function (event) {
    this.emit(event, response, reasonPhrase);
  }, this);

  return this;
}

ServerContext.prototype.progress = function (options) {
  return replyHelper.call(this, options, 180, 100, 199, ['progress']);
};

ServerContext.prototype.accept = function (options) {
  return replyHelper.call(this, options, 200, 200, 299, ['accepted']);
};

ServerContext.prototype.reject = function (options) {
  return replyHelper.call(this, options, 480, 300, 699, ['rejected', 'failed']);
};

ServerContext.prototype.reply = function (options) {
  return replyHelper.call(this, options, 100, 0, 699, []);
};

ServerContext.prototype.onRequestTimeout = function () {
  this.emit('failed', null, C.causes.REQUEST_TIMEOUT);
};

ServerContext.prototype.onTransportError = function () {
  this.emit('failed', null, C.causes.CONNECTION_ERROR);
};
