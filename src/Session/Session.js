var DTMF = require('./DTMF');
var C = require('./Constants');
var Hacks = require('../Hacks');
var Exceptions = require('../Exceptions');
var Utils = require('../Utils');
var WebRTC = require('../WebRTC');
var Timers = require('../Timers');
var InviteServerContext = require('./InviteServerContext');
var InviteClientContext = require('./InviteClientContext');
var Grammar = require('../Grammar/dist/Grammar');
var OutgoingRequest = require('../SIPMessage/OutgoingRequest');
var RequestSender = require('../RequestSender');
var Dialog = require('../Dialogs');

/*
 * @param {function returning MediaHandler} [mediaHandlerFactory]
 *        (See the documentation for the mediaHandlerFactory argument of the UA constructor.)
 */
var Session = module.exports = function (mediaHandlerFactory) {
  var events = [
  'connecting',
  'terminated',
  'dtmf',
  'invite',
  'cancel',
  'refer',
  'bye',
  'hold',
  'unhold',
  'muted',
  'unmuted'
  ];

  this.status = C.STATUS_NULL;
  this.dialog = null;
  this.earlyDialogs = {};
  this.mediaHandlerFactory = mediaHandlerFactory || WebRTC.MediaHandler.defaultFactory;
  // this.mediaHandler gets set by ICC/ISC constructors
  this.hasOffer = false;
  this.hasAnswer = false;

  // Session Timers
  this.timers = {
    ackTimer: null,
    expiresTimer: null,
    invite2xxTimer: null,
    userNoAnswerTimer: null,
    rel1xxTimer: null,
    prackTimer: null
  };

  // Session info
  this.startTime = null;
  this.endTime = null;
  this.tones = null;

  // Mute/Hold state
  this.local_hold = false;
  this.remote_hold = false;

  this.pending_actions = {
    actions: [],

    length: function() {
      return this.actions.length;
    },

    isPending: function(name){
      var
      idx = 0,
      length = this.actions.length;

      for (idx; idx<length; idx++) {
        if (this.actions[idx].name === name) {
          return true;
        }
      }
      return false;
    },

    shift: function() {
      return this.actions.shift();
    },

    push: function(name) {
      this.actions.push({
        name: name
      });
    },

    pop: function(name) {
      var
      idx = 0,
      length = this.actions.length;

      for (idx; idx<length; idx++) {
        if (this.actions[idx].name === name) {
          this.actions.splice(idx,1);
          length --;
          idx--;
        }
      }
    }
   };

  this.early_sdp = null;
  this.rel100 = C.supported.UNSUPPORTED;

  this.initMoreEvents(events);
};

Session.prototype = {
  dtmf: function(tones, options) {
    var tone, dtmfs = [],
        self = this;

    options = options || {};

    if (tones === undefined) {
      throw new TypeError('Not enough arguments');
    }

    // Check Session Status
    if (this.status !== C.STATUS_CONFIRMED && this.status !== C.STATUS_WAITING_FOR_ACK) {
      throw new Exceptions.InvalidStateError(this.status);
    }

    // Check tones
    if (!tones || (typeof tones !== 'string' && typeof tones !== 'number') || !tones.toString().match(/^[0-9A-D#*,]+$/i)) {
      throw new TypeError('Invalid tones: '+ tones);
    }

    tones = tones.toString().split('');

    while (tones.length > 0) { dtmfs.push(new DTMF(this, tones.shift(), options)); }

    if (this.tones) {
      // Tones are already queued, just add to the queue
      this.tones =  this.tones.concat(dtmfs);
      return this;
    }

    var sendDTMF = function () {
      var dtmf, timeout;

      if (self.status === C.STATUS_TERMINATED || !self.tones || self.tones.length === 0) {
        // Stop sending DTMF
        self.tones = null;
        return this;
      }

      dtmf = self.tones.shift();

      if (tone === ',') {
        timeout = 2000;
      } else {
        dtmf.on('failed', function(){self.tones = null;});
        dtmf.send(options);
        timeout = dtmf.duration + dtmf.interToneGap;
      }

      // Set timeout for the next tone
      Timers.setTimeout(sendDTMF, timeout);
    };

    this.tones = dtmfs;
    sendDTMF();
    return this;
  },

  bye: function(options) {
    options = options || {};
    var statusCode = options.statusCode;

    // Check Session Status
    if (this.status === C.STATUS_TERMINATED) {
      this.logger.error('Error: Attempted to send BYE in a terminated session.');
      return this;
    }

    this.logger.log('terminating Session');

    if (statusCode && (statusCode < 200 || statusCode >= 700)) {
      throw new TypeError('Invalid statusCode: '+ statusCode);
    }

    options.receiveResponse = function () {};

    return this.
      sendRequest(C.BYE, options).
      terminated();
  },

  refer: function(target, options) {
    options = options || {};
    var extraHeaders = (options.extraHeaders || []).slice(),
        originalTarget = target;

    if (target === undefined) {
      throw new TypeError('Not enough arguments');
    } else if (target instanceof InviteServerContext || target instanceof InviteClientContext) {
      //Attended Transfer
      // B.transfer(C)
      extraHeaders.push('Contact: '+ this.contact);
      extraHeaders.push('Allow: '+ Utils.getAllowedMethods(this.ua));
      extraHeaders.push('Refer-To: <' + target.dialog.remote_target.toString() + '?Replaces=' + target.dialog.id.call_id + '%3Bto-tag%3D' + target.dialog.id.remote_tag + '%3Bfrom-tag%3D' + target.dialog.id.local_tag + '>');
    } else {
      //Blind Transfer

      // Check Session Status
      if (this.status !== C.STATUS_CONFIRMED) {
        throw new Exceptions.InvalidStateError(this.status);
      }

      // normalizeTarget allows instances of URI to pass through unaltered,
      // so try to make one ahead of time
      try {
        target = Grammar.parse(target, 'Refer_To').uri || target;
      } catch (e) {
        this.logger.debug(".refer() cannot parse Refer_To from", target);
        this.logger.debug("...falling through to normalizeTarget()");
      }

      // Check target validity
      target = this.ua.normalizeTarget(target);
      if (!target) {
        throw new TypeError('Invalid target: ' + originalTarget);
      }

      extraHeaders.push('Contact: '+ this.contact);
      extraHeaders.push('Allow: '+ Utils.getAllowedMethods(this.ua));
      extraHeaders.push('Refer-To: '+ target);
    }

    // Send the request
    this.sendRequest(C.REFER, {
      extraHeaders: extraHeaders,
      body: options.body,
      receiveResponse: function() {}
    });
    // hang up only if we transferred to a SIP address
    if (target.scheme.match("^sips?$")) {
      this.terminate();
    }
    return this;
  },

  followRefer: function followRefer (callback) {
    return function referListener (callback, request) {
      // open non-SIP URIs if possible and keep session open
      var target = request.parseHeader('refer-to').uri;
      if (!target.scheme.match("^sips?$")) {
        var targetString = target.toString();
        if (typeof global.open === "function") {
          global.open(targetString);
        } else {
          this.logger.warn("referred to non-SIP URI but `open` isn't a global function: " + targetString);
        }
        return;
      }

      Hacks.Chrome.getsConfusedAboutGUM(this);

      /*
        Harmless race condition.  Both sides of REFER
        may send a BYE, but in the end the dialogs are destroyed.
      */
      var referSession = this.ua.invite(request.parseHeader('refer-to').uri, {
        media: this.mediaHint
      });

      callback.call(this, request, referSession);

      this.terminate();
    }.bind(this, callback);
  },

  sendRequest: function(method,options) {
    options = options || {};
    var self = this;

    var request = new OutgoingRequest(
      method,
      this.dialog.remote_target,
      this.ua,
      {
        cseq: options.cseq || (this.dialog.local_seqnum += 1),
        call_id: this.dialog.id.call_id,
        from_uri: this.dialog.local_uri,
        from_tag: this.dialog.id.local_tag,
        to_uri: this.dialog.remote_uri,
        to_tag: this.dialog.id.remote_tag,
        route_set: this.dialog.route_set,
        statusCode: options.statusCode,
        reasonPhrase: options.reasonPhrase
      },
      options.extraHeaders || [],
      options.body
    );

    new RequestSender({
      request: request,
      onRequestTimeout: function() {
        self.onRequestTimeout();
      },
      onTransportError: function() {
        self.onTransportError();
      },
      receiveResponse: options.receiveResponse || function(response) {
        self.receiveNonInviteResponse(response);
      }
    }, this.ua).send();

    // Emit the request event
    if (this.checkEvent(method.toLowerCase())) {
      this.emit(method.toLowerCase(), request);
    }

    return this;
  },

  close: function() {
    var idx;

    if(this.status === C.STATUS_TERMINATED) {
      return this;
    }

    this.logger.log('closing INVITE session ' + this.id);

    // 1st Step. Terminate media.
    if (this.mediaHandler){
      this.mediaHandler.close();
    }

    // 2nd Step. Terminate signaling.

    // Clear session timers
    for(idx in this.timers) {
      Timers.clearTimeout(this.timers[idx]);
    }

    // Terminate dialogs

    // Terminate confirmed dialog
    if(this.dialog) {
      this.dialog.terminate();
      delete this.dialog;
    }

    // Terminate early dialogs
    for(idx in this.earlyDialogs) {
      this.earlyDialogs[idx].terminate();
      delete this.earlyDialogs[idx];
    }

    this.status = C.STATUS_TERMINATED;

    delete this.ua.sessions[this.id];
    return this;
  },

  createDialog: function(message, type, early) {
    var dialog, early_dialog,
      local_tag = message[(type === 'UAS') ? 'to_tag' : 'from_tag'],
      remote_tag = message[(type === 'UAS') ? 'from_tag' : 'to_tag'],
      id = message.call_id + local_tag + remote_tag;

    early_dialog = this.earlyDialogs[id];

    // Early Dialog
    if (early) {
      if (early_dialog) {
        return true;
      } else {
        early_dialog = new Dialog(this, message, type, Dialog.C.STATUS_EARLY);

        // Dialog has been successfully created.
        if(early_dialog.error) {
          this.logger.error(early_dialog.error);
          this.failed(message, C.causes.INTERNAL_ERROR);
          return false;
        } else {
          this.earlyDialogs[id] = early_dialog;
          return true;
        }
      }
    }
    // Confirmed Dialog
    else {
      // In case the dialog is in _early_ state, update it
      if (early_dialog) {
        early_dialog.update(message, type);
        this.dialog = early_dialog;
        delete this.earlyDialogs[id];
        for (var dia in this.earlyDialogs) {
          this.earlyDialogs[dia].terminate();
          delete this.earlyDialogs[dia];
        }
        return true;
      }

      // Otherwise, create a _confirmed_ dialog
      dialog = new Dialog(this, message, type);

      if(dialog.error) {
        this.logger.error(dialog.error);
        this.failed(message, C.causes.INTERNAL_ERROR);
        return false;
      } else {
        this.to_tag = message.to_tag;
        this.dialog = dialog;
        return true;
      }
    }
  },

  /**
  * Check if Session is ready for a re-INVITE
  *
  * @returns {Boolean}
  */
  isReadyToReinvite: function() {
    return this.mediaHandler.isReady() &&
      !this.dialog.uac_pending_reply &&
      !this.dialog.uas_pending_reply;
  },

  /**
   * Mute
   */
  mute: function(options) {
    var ret = this.mediaHandler.mute(options);
    if (ret) {
      this.onmute(ret);
    }
  },

  /**
   * Unmute
   */
  unmute: function(options) {
    var ret = this.mediaHandler.unmute(options);
    if (ret) {
      this.onunmute(ret);
    }
  },

  /**
   * Hold
   */
  hold: function() {

    if (this.status !== C.STATUS_WAITING_FOR_ACK && this.status !== C.STATUS_CONFIRMED) {
      throw new Exceptions.InvalidStateError(this.status);
    }

    this.mediaHandler.hold();

    // Check if RTCSession is ready to send a reINVITE
    if (!this.isReadyToReinvite()) {
      /* If there is a pending 'unhold' action, cancel it and don't queue this one
       * Else, if there isn't any 'hold' action, add this one to the queue
       * Else, if there is already a 'hold' action, skip
       */
      if (this.pending_actions.isPending('unhold')) {
        this.pending_actions.pop('unhold');
      } else if (!this.pending_actions.isPending('hold')) {
        this.pending_actions.push('hold');
      }
      return;
    } else if (this.local_hold === true) {
        return;
    }

    this.onhold('local');

    this.sendReinvite({
      mangle: function(body){

        // Don't receive media
        // TODO - This will break for media streams with different directions.
        if (!(/a=(sendrecv|sendonly|recvonly|inactive)/).test(body)) {
          body = body.replace(/(m=[^\r]*\r\n)/g, '$1a=sendonly\r\n');
        } else {
          body = body.replace(/a=sendrecv\r\n/g, 'a=sendonly\r\n');
          body = body.replace(/a=recvonly\r\n/g, 'a=inactive\r\n');
        }

        return body;
      }
    });
  },

  /**
   * Unhold
   */
  unhold: function() {

    if (this.status !== C.STATUS_WAITING_FOR_ACK && this.status !== C.STATUS_CONFIRMED) {
      throw new Exceptions.InvalidStateError(this.status);
    }

    this.mediaHandler.unhold();

    if (!this.isReadyToReinvite()) {
      /* If there is a pending 'hold' action, cancel it and don't queue this one
       * Else, if there isn't any 'unhold' action, add this one to the queue
       * Else, if there is already a 'unhold' action, skip
       */
      if (this.pending_actions.isPending('hold')) {
        this.pending_actions.pop('hold');
      } else if (!this.pending_actions.isPending('unhold')) {
        this.pending_actions.push('unhold');
      }
      return;
    } else if (this.local_hold === false) {
      return;
    }

    this.onunhold('local');

    this.sendReinvite();
  },

  /**
   * isOnHold
   */
  isOnHold: function() {
    return {
      local: this.local_hold,
      remote: this.remote_hold
    };
  },

  /**
   * In dialog INVITE Reception
   * @private
   */
  receiveReinvite: function(request) {
    var self = this;

    if (!request.body) {
      return;
    }

    if (request.getHeader('Content-Type') !== 'application/sdp') {
      this.logger.warn('invalid Content-Type');
      request.reply(415);
      return;
    }

    this.mediaHandler.setDescription(request.body)
    .then(this.mediaHandler.getDescription.bind(this.mediaHandler, this.mediaHint))
    .then(function(body) {
      request.reply(200, null, ['Contact: ' + self.contact], body,
        function() {
          self.status = C.STATUS_WAITING_FOR_ACK;
          self.setInvite2xxTimer(request, body);
          self.setACKTimer();

          // Are we holding?
          var hold = (/a=(sendonly|inactive)/).test(request.body);

          if (self.remote_hold && !hold) {
            self.onunhold('remote');
          } else if (!self.remote_hold && hold) {
            self.onhold('remote');
          }
        });
    })
    .catch(function onFailure (e) {
      var statusCode;
      if (e instanceof Exceptions.GetDescriptionError) {
        statusCode = 500;
      } else {
        self.logger.error(e);
        statusCode = 488;
      }
      request.reply(statusCode);
    });
  },

  sendReinvite: function(options) {
    options = options || {};

    var
      self = this,
       extraHeaders = (options.extraHeaders || []).slice(),
       eventHandlers = options.eventHandlers || {},
       mangle = options.mangle || null;

    if (eventHandlers.succeeded) {
      this.reinviteSucceeded = eventHandlers.succeeded;
    } else {
      this.reinviteSucceeded = function(){
        Timers.clearTimeout(self.timers.ackTimer);
        Timers.clearTimeout(self.timers.invite2xxTimer);
        self.status = C.STATUS_CONFIRMED;
      };
    }
    if (eventHandlers.failed) {
      this.reinviteFailed = eventHandlers.failed;
    } else {
      this.reinviteFailed = function(){};
    }

    extraHeaders.push('Contact: ' + this.contact);
    extraHeaders.push('Allow: '+ Utils.getAllowedMethods(this.ua));
    extraHeaders.push('Content-Type: application/sdp');

    this.receiveResponse = this.receiveReinviteResponse;
    //REVISIT
    this.mediaHandler.getDescription(self.mediaHint)
    .then(mangle)
    .then(
      function(body){
        self.dialog.sendRequest(self, C.INVITE, {
          extraHeaders: extraHeaders,
          body: body
        });
      },
      function() {
        if (self.isReadyToReinvite()) {
          self.onReadyToReinvite();
        }
        self.reinviteFailed();
      }
    );
  },

  receiveRequest: function (request) {
    switch (request.method) {
      case C.BYE:
        request.reply(200);
        if(this.status === C.STATUS_CONFIRMED) {
          this.emit('bye', request);
          this.terminated(request, C.causes.BYE);
        }
        break;
      case C.INVITE:
        if(this.status === C.STATUS_CONFIRMED) {
          this.logger.log('re-INVITE received');
          // Switch these two lines to try re-INVITEs:
          //this.receiveReinvite(request);
          request.reply(488, null, ['Warning: 399 sipjs "Cannot update media description"']);
        }
        break;
      case C.INFO:
        if(this.status === C.STATUS_CONFIRMED || this.status === C.STATUS_WAITING_FOR_ACK) {
          var body, tone, duration,
              contentType = request.getHeader('content-type'),
              reg_tone = /^(Signal\s*?=\s*?)([0-9A-D#*]{1})(\s)?.*/,
              reg_duration = /^(Duration\s?=\s?)([0-9]{1,4})(\s)?.*/;

          if (contentType) {
            if (contentType.match(/^application\/dtmf-relay/i)) {
              if (request.body) {
                body = request.body.split('\r\n', 2);
                if (body.length === 2) {
                  if (reg_tone.test(body[0])) {
                    tone = body[0].replace(reg_tone,"$2");
                  }
                  if (reg_duration.test(body[1])) {
                    duration = parseInt(body[1].replace(reg_duration,"$2"), 10);
                  }
                }
              }

              new DTMF(this, tone, {duration: duration}).init_incoming(request);
            } else {
              request.reply(415, null, ["Accept: application/dtmf-relay"]);
            }
          }
        }
        break;
      case C.REFER:
        if(this.status ===  C.STATUS_CONFIRMED) {
          this.logger.log('REFER received');
          request.reply(202, 'Accepted');
          var
            hasReferListener = this.checkListener('refer'),
            notifyBody = hasReferListener ?
              'SIP/2.0 100 Trying' :
              // RFC 3515.2.4.2: 'the UA MAY decline the request.'
              'SIP/2.0 603 Declined'
          ;

          this.sendRequest(C.NOTIFY, {
            extraHeaders:[
              'Event: refer',
              'Subscription-State: terminated',
              'Content-Type: message/sipfrag'
            ],
            body: notifyBody,
            receiveResponse: function() {}
          });

          if (hasReferListener) {
            this.emit('refer', request);
          }
        }
        break;
    }
  },

  /**
   * Reception of Response for in-dialog INVITE
   * @private
   */
  receiveReinviteResponse: function(response) {
    var self = this,
        contentType = response.getHeader('Content-Type');

    if (this.status === C.STATUS_TERMINATED) {
      return;
    }

    switch(true) {
      case /^1[0-9]{2}$/.test(response.status_code):
        break;
      case /^2[0-9]{2}$/.test(response.status_code):
        this.status = C.STATUS_CONFIRMED;

        this.sendRequest(C.ACK,{cseq:response.cseq});

        if(!response.body) {
          this.reinviteFailed();
          break;
        } else if (contentType !== 'application/sdp') {
          this.reinviteFailed();
          break;
        }

        //REVISIT
        this.mediaHandler.setDescription(response.body)
        .then(
          function onSuccess () {
            self.reinviteSucceeded();
          },
          function onFailure () {
            self.reinviteFailed();
          }
        );
        break;
      default:
        this.reinviteFailed();
    }
  },

  acceptAndTerminate: function(response, status_code, reason_phrase) {
    var extraHeaders = [];

    if (status_code) {
      extraHeaders.push('Reason: ' + Utils.getReasonHeaderValue(status_code, reason_phrase));
    }

    // An error on dialog creation will fire 'failed' event
    if (this.dialog || this.createDialog(response, 'UAC')) {
      this.sendRequest(C.ACK,{cseq: response.cseq});
      this.sendRequest(C.BYE, {
        extraHeaders: extraHeaders
      });
    }

    return this;
  },

  /**
   * RFC3261 13.3.1.4
   * Response retransmissions cannot be accomplished by transaction layer
   *  since it is destroyed when receiving the first 2xx answer
   */
  setInvite2xxTimer: function(request, body) {
    var self = this,
        timeout = Timers.T1;

    this.timers.invite2xxTimer = Timers.setTimeout(function invite2xxRetransmission() {
      if (self.status !== C.STATUS_WAITING_FOR_ACK) {
        return;
      }

      self.logger.log('no ACK received, attempting to retransmit OK');

      request.reply(200, null, ['Contact: ' + self.contact], body);

      timeout = Math.min(timeout * 2, Timers.T2);

      self.timers.invite2xxTimer = Timers.setTimeout(invite2xxRetransmission, timeout);
    }, timeout);
  },

  /**
   * RFC3261 14.2
   * If a UAS generates a 2xx response and never receives an ACK,
   *  it SHOULD generate a BYE to terminate the dialog.
   */
  setACKTimer: function() {
    var self = this;

    this.timers.ackTimer = Timers.setTimeout(function() {
      if(self.status === C.STATUS_WAITING_FOR_ACK) {
        self.logger.log('no ACK received for an extended period of time, terminating the call');
        Timers.clearTimeout(self.timers.invite2xxTimer);
        self.sendRequest(C.BYE);
        self.terminated(null, C.causes.NO_ACK);
      }
    }, Timers.TIMER_H);
  },

  /*
   * @private
   */
  onReadyToReinvite: function() {
    var action = this.pending_actions.shift();

    if (!action || !this[action.name]) {
      return;
    }

    this[action.name]();
  },

  onTransportError: function() {
    if (this.status === C.STATUS_CONFIRMED) {
      this.terminated(null, C.causes.CONNECTION_ERROR);
    } else if (this.status !== C.STATUS_TERMINATED) {
      this.failed(null, C.causes.CONNECTION_ERROR);
    }
  },

  onRequestTimeout: function() {
    if (this.status === C.STATUS_CONFIRMED) {
      this.terminated(null, C.causes.REQUEST_TIMEOUT);
    } else if (this.status !== C.STATUS_TERMINATED) {
      this.failed(null, C.causes.REQUEST_TIMEOUT);
    }
  },

  onDialogError: function(response) {
    if (this.status === C.STATUS_CONFIRMED) {
      this.terminated(response, C.causes.DIALOG_ERROR);
    } else if (this.status !== C.STATUS_TERMINATED) {
      this.failed(response, C.causes.DIALOG_ERROR);
    }
  },

  /**
   * @private
   */
  onhold: function(originator) {
    this[originator === 'local' ? 'local_hold' : 'remote_hold'] = true;
    this.emit('hold', { originator: originator });
  },

  /**
   * @private
   */
  onunhold: function(originator) {
    this[originator === 'local' ? 'local_hold' : 'remote_hold'] = false;
    this.emit('unhold', { originator: originator });
  },

  /*
   * @private
   */
  onmute: function(options) {
    this.emit('muted', {
      audio: options.audio,
      video: options.video
    });
  },

  /*
   * @private
   */
  onunmute: function(options) {
    this.emit('unmuted', {
      audio: options.audio,
      video: options.video
    });
  },

  failed: function(response, cause) {
    this.close();
    return this.emit('failed', response, cause);
  },

  rejected: function(response, cause) {
    this.close();
    return this.emit('rejected',
      response || null,
      cause
    );
  },

  canceled: function() {
    this.close();
    return this.emit('cancel');
  },

  accepted: function(response, cause) {
    cause = Utils.getReasonPhrase(response && response.status_code, cause);

    this.startTime = new Date();

    return this.emit('accepted', response, cause);
  },

  terminated: function(message, cause) {
    this.endTime = new Date();

    this.close();
    return this.emit('terminated', {
      message: message || null,
      cause: cause || null
    });
  },

  connecting: function(request) {
    return this.emit('connecting', { request: request });
  }
};

Session.C = C;
