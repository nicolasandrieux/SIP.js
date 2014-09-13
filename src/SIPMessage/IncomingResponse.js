/**
 * @augments IncomingMessage
 * @class Class for incoming SIP response.
 */
module.exports = function (SIP) {

var IncomingMessage = require('./IncomingMessage')(SIP);

var IncomingResponse = function(ua) {
  this.logger = ua.getLogger('sip.sipmessage');
  this.headers = {};
  this.status_code = null;
  this.reason_phrase = null;
};
IncomingResponse.prototype = new IncomingMessage();

return IncomingResponse;

};
