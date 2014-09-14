var IncomingMessage = require('./IncomingMessage');
/**
 * @augments IncomingMessage
 * @class Class for incoming SIP response.
 */

var IncomingResponse = module.exports = function(ua) {
  this.logger = ua.getLogger('sip.sipmessage');
  this.headers = {};
  this.status_code = null;
  this.reason_phrase = null;
};
IncomingResponse.prototype = new IncomingMessage();
