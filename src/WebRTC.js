/**
 * @fileoverview WebRTC
 */

var WebRTC = module.exports = {};
var Utils = require('./Utils');

WebRTC.MediaHandler = require('./WebRTC/MediaHandler');
WebRTC.MediaStreamManager = require('./WebRTC/MediaStreamManager');

var _isSupported;

WebRTC.isSupported = function () {
  if (_isSupported !== undefined) {
    return _isSupported;
  }

  WebRTC.MediaStream = Utils.getPrefixedProperty(global, 'MediaStream');
  WebRTC.getUserMedia = Utils.getPrefixedProperty(global.navigator, 'getUserMedia');
  WebRTC.RTCPeerConnection = Utils.getPrefixedProperty(global, 'RTCPeerConnection');
  WebRTC.RTCSessionDescription = Utils.getPrefixedProperty(global, 'RTCSessionDescription');

  if (WebRTC.getUserMedia && WebRTC.RTCPeerConnection && WebRTC.RTCSessionDescription) {
    WebRTC.getUserMedia = Utils.addPromise(WebRTC.getUserMedia, global.navigator);
    _isSupported = true;
  }
  else {
    _isSupported = false;
  }
  return _isSupported;
};
