/**
 * @fileoverview WebRTC
 */

module.exports = function (SIP, window, MediaHandler, MediaStreamManager) {
var WebRTC;

WebRTC = {};

WebRTC.MediaHandler = MediaHandler;
WebRTC.MediaStreamManager = MediaStreamManager;

WebRTC.MediaStream = SIP.Utils.getPrefixedProperty(window, 'MediaStream');
WebRTC.getUserMedia = SIP.Utils.getPrefixedProperty(window.navigator, 'getUserMedia');
WebRTC.RTCPeerConnection = SIP.Utils.getPrefixedProperty(window, 'RTCPeerConnection');
WebRTC.RTCSessionDescription = SIP.Utils.getPrefixedProperty(window, 'RTCSessionDescription');

if (WebRTC.getUserMedia && WebRTC.RTCPeerConnection && WebRTC.RTCSessionDescription) {
  WebRTC.getUserMedia = WebRTC.getUserMedia.bind(window.navigator);
  WebRTC.isSupported = true;
}
else {
  WebRTC.isSupported = false;
}

SIP.WebRTC = WebRTC;
};
