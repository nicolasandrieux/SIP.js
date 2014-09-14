/**
 * @fileoverview MediaStreamManager
 */

var Utils = require('../Utils');
var WebRTC = require('../WebRTC');
var Exceptions = require('../Exceptions');
var Timers = require('../Timers');
var EventEmitter = require('../EventEmitter');

/* MediaStreamManager
 * @class Manages the acquisition and release of MediaStreams.
 * @param {mediaHint} [defaultMediaHint] The mediaHint to use if none is provided to acquire()
 */

// Default MediaStreamManager provides single-use streams created with getUserMedia
var MediaStreamManager = module.exports = function MediaStreamManager (logger, defaultMediaHint) {
  if (!WebRTC.isSupported()) {
    throw new Exceptions.NotSupportedError('Media not supported');
  }

  var events = [
    'userMediaRequest',
    'userMedia',
    'userMediaFailed'
  ];
  this.mediaHint = defaultMediaHint || {
    constraints: {audio: true, video: true}
  };

  this.logger = logger;
  this.initEvents(events);

  // map of streams to acquisition manner:
  // true -> passed in as mediaHint.stream
  // false -> getUserMedia
  this.acquisitions = {};
};
MediaStreamManager.streamId = function (stream) {
  return stream.getAudioTracks().concat(stream.getVideoTracks())
    .map(function trackId (track) {
      return track.id;
    })
    .join('');
};

MediaStreamManager.render = function render (stream, elements) {
  if (!elements) {
    return false;
  }

  function attachAndPlay (element, stream) {
    (global.attachMediaStream || attachMediaStream)(element, stream);
    ensureMediaPlaying(element);
  }

  function attachMediaStream(element, stream) {
    if (typeof element.src !== 'undefined') {
      global.URL.revokeObjectURL(element.src);
      element.src = global.URL.createObjectURL(stream);
    } else if (typeof (element.srcObject || element.mozSrcObject) !== 'undefined') {
      element.srcObject = element.mozSrcObject = stream;
    } else {
      return false;
    }

    return true;
  }

  function ensureMediaPlaying (mediaElement) {
    var interval = 100;
    mediaElement.ensurePlayingIntervalId = Timers.setInterval(function () {
      if (mediaElement.paused) {
        mediaElement.play();
      }
      else {
        Timers.clearInterval(mediaElement.ensurePlayingIntervalId);
      }
    }, interval);
  }

  if (elements.video) {
    if (elements.audio) {
      elements.video.volume = 0;
    }
    attachAndPlay(elements.video, stream);
  }
  if (elements.audio) {
    attachAndPlay(elements.audio, stream);
  }
};

MediaStreamManager.prototype = Object.create(EventEmitter.prototype, {
  'acquire': {value: function acquire (mediaHint) {
    mediaHint = Object.keys(mediaHint || {}).length ? mediaHint : this.mediaHint;

    var saveSuccess = function (isHintStream, stream) {
      var streamId = MediaStreamManager.streamId(stream);
      this.acquisitions[streamId] = !!isHintStream;
      return Utils.Promise.resolve(stream);
    }.bind(this);

    if (mediaHint.stream) {
      return saveSuccess(true, mediaHint.stream);
    } else {
      // Fallback to audio/video enabled if no mediaHint can be found.
      var constraints = mediaHint.constraints ||
        (this.mediaHint && this.mediaHint.constraints) ||
        {audio: true, video: true};

      var deferred = Utils.defer();

      /*
       * Make the call asynchronous, so that ICCs have a chance
       * to define callbacks to `userMediaRequest`
       */
      Timers.setTimeout(function () {
        this.emit('userMediaRequest', constraints);

        var emitThenCall = function (eventName, callback) {
          var callbackArgs = Array.prototype.slice.call(arguments, 2);
          // Emit with all of the arguments from the real callback.
          var newArgs = [eventName].concat(callbackArgs);

          this.emit.apply(this, newArgs);

          return callback.apply(null, callbackArgs);
        }.bind(this);

        deferred.resolve(
          WebRTC.getUserMedia(constraints)
          .then(
            emitThenCall.bind(this, 'userMedia', saveSuccess.bind(null, false)),
            emitThenCall.bind(this, 'userMediaFailed', function(e){throw e;})
          )
        );
      }.bind(this), 0);

      return deferred.promise;
    }
  }},

  'release': {value: function release (stream) {
    var streamId = MediaStreamManager.streamId(stream);
    if (this.acquisitions[streamId] === false) {
      stream.stop();
    }
    delete this.acquisitions[streamId];
  }},
});
