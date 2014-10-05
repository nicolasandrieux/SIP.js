/**
 * @fileoverview MediaHandler
 */

var EventEmitter = require('./EventEmitter');

/* MediaHandler
 * @class PeerConnection helper Class.
 * @param {SIP.Session} session
 * @param {Object} [options]
 */
var MediaHandler = module.exports = function MediaHandler (session, options) {
  // keep jshint happy
  session = session;
  options = options;
};

MediaHandler.prototype = Object.create(EventEmitter.prototype, {
  isReady: {value: function isReady () {}},

  close: {value: function close () {}},

  /**
   * @param {Object} [mediaHint] A custom object describing the media to be used during this session.
   */
  getDescription: {value: function getDescription (mediaHint) {
    // keep jshint happy
    mediaHint = mediaHint;
  }},

  /**
  * Message reception.
  * @param {String} type
  * @param {String} description
  */
  setDescription: {value: function setDescription (description) {
    // keep jshint happy
    description = description;
  }}
});
