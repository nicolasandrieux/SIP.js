/**
 * @fileoverview WebRTC
 */

var addPromise = require('./Utils/Promise/addPromise');

module.exports = function (SIP) {
var WebRTC;

WebRTC = {};

WebRTC.MediaHandler = require('./WebRTC/MediaHandler')(SIP);
WebRTC.MediaStreamManager = require('./WebRTC/MediaStreamManager')(SIP);

function getPrefixedProperty (object, name) {
  if (object == null) {
    return;
  }
  var capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
  var prefixedNames = [name, 'webkit' + capitalizedName, 'moz' + capitalizedName];
  for (var i in prefixedNames) {
    var property = object[prefixedNames[i]];
    if (property) {
      return property;
    }
  }
}

var _isSupported;

WebRTC.isSupported = function () {
  if (_isSupported !== undefined) {
    return _isSupported;
  }

  WebRTC.MediaStream = getPrefixedProperty(global, 'MediaStream');
  WebRTC.getUserMedia = getPrefixedProperty(global.navigator, 'getUserMedia');
  WebRTC.RTCPeerConnection = getPrefixedProperty(global, 'RTCPeerConnection');
  WebRTC.RTCSessionDescription = getPrefixedProperty(global, 'RTCSessionDescription');

  if (WebRTC.getUserMedia && WebRTC.RTCPeerConnection && WebRTC.RTCSessionDescription) {
    WebRTC.getUserMedia = addPromise(WebRTC.getUserMedia, global.navigator);
    _isSupported = true;
  }
  else {
    _isSupported = false;
  }
  return _isSupported;
};

return WebRTC;
};
