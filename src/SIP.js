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

SIP.Utils = require('./Utils')(SIP);
SIP.LoggerFactory = require('./LoggerFactory');
SIP.EventEmitter = require('./EventEmitter');
SIP.C = require('./Constants')(SIP.name, SIP.version);
SIP.Exceptions = require('./Exceptions');
SIP.Timers = require('./Timers');
SIP.Transport = require('./Transport')(SIP, global.WebSocket);
SIP.Parser = require('./Parser')(SIP);
require('./SIPMessage')(SIP);
SIP.URI = require('./URI')(SIP);
SIP.NameAddrHeader = require('./NameAddrHeader')(SIP);
SIP.Transactions = require('./Transactions')(SIP);
SIP.Dialog = require('./Dialogs')(SIP);
SIP.RequestSender = require('./RequestSender')(SIP);
SIP.RegisterContext = require('./RegisterContext')(SIP);
SIP.MediaHandler = require('./MediaHandler');
SIP.ClientContext = require('./ClientContext')(SIP);
SIP.ServerContext = require('./ServerContext')(SIP);
require('./Session')(SIP);
SIP.Subscription = require('./Subscription')(SIP);
SIP.WebRTC = require('./WebRTC')(SIP);
SIP.UA = require('./UA')(SIP);
SIP.sanityCheck = require('./SanityCheck')(SIP);
SIP.DigestAuthentication = require('./DigestAuthentication')(SIP.Utils);
SIP.Grammar = require('./Grammar/dist/Grammar')(SIP);
