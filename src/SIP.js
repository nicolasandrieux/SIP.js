/**
 * @name SIP
 * @namespace
 */
  "use strict";

  var SIP = {};
  module.exports = SIP;

  var pkg = require('../package.json');

  Object.defineProperties(SIP, {
    version: {
      get: function(){ return pkg.version; }
    },
    name: {
      get: function(){ return pkg.title; }
    }
  });

  require('./Utils')(SIP);
  SIP.LoggerFactory = require('./LoggerFactory');

  SIP.EventEmitter = require('events').EventEmitter;
  SIP.EventEmitter.prototype.checkListener = function checkListener (event) {
    return this.listeners(event).length > 0;
  };
  SIP.EventEmitter.prototype.off = function off (type, listener) {
    if (arguments.length < 2) {
      return this.removeAllListeners.apply(this, arguments);
    } else {
      return this.removeListener(type, listener);
    }
  };

  SIP.C = require('./Constants')(SIP.name, SIP.version);
  SIP.Exceptions = require('./Exceptions');
  SIP.Timers = require('./Timers');
  require('./Transport')(SIP, global.WebSocket);
  require('./Parser')(SIP);
  require('./SIPMessage')(SIP);
  require('./URI')(SIP);
  require('./NameAddrHeader')(SIP);
  require('./Transactions')(SIP);
  require('./Dialogs')(SIP);
  require('./RequestSender')(SIP);
  require('./RegisterContext')(SIP);
  SIP.MediaHandler = require('./MediaHandler')(SIP.EventEmitter);
  require('./ClientContext')(SIP);
  require('./ServerContext')(SIP);
  require('./Session')(SIP);
  require('./Subscription')(SIP);
  SIP.WebRTC = require('./WebRTC')(SIP);
  require('./UA')(SIP);
  SIP.Hacks = require('./Hacks');
  require('./SanityCheck')(SIP);
  SIP.DigestAuthentication = require('./DigestAuthentication')(SIP.Utils);
  SIP.Grammar = require('./Grammar/dist/Grammar')(SIP);
