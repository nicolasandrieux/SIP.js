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

SIP.Utils = require('./Utils');
SIP.LoggerFactory = require('./LoggerFactory');
SIP.EventEmitter = require('./EventEmitter');
SIP.C = require('./Constants')(SIP.name, SIP.version);
SIP.Exceptions = require('./Exceptions');
SIP.Timers = require('./Timers');
SIP.Transport = require('./Transport');
SIP.Parser = require('./Parser');
SIP.OutgoingRequest = require('./SIPMessage/OutgoingRequest');
SIP.IncomingRequest = require('./SIPMessage/IncomingRequest');
SIP.IncomingResponse = require('./SIPMessage/IncomingResponse');
SIP.URI = require('./URI');
SIP.NameAddrHeader = require('./NameAddrHeader');
SIP.Transactions = require('./Transactions');
SIP.Dialog = require('./Dialogs');
SIP.RequestSender = require('./RequestSender');
SIP.RegisterContext = require('./RegisterContext');
SIP.MediaHandler = require('./MediaHandler');
SIP.ClientContext = require('./ClientContext');
SIP.ServerContext = require('./ServerContext');
SIP.Session = require('./Session/Session');
SIP.InviteServerContext = require('./Session/InviteServerContext');
SIP.InviteClientContext = require('./Session/InviteClientContext');
SIP.Subscription = require('./Subscription');
SIP.WebRTC = require('./WebRTC');
SIP.UA = require('./UA');
SIP.Hacks = require('./Hacks');
SIP.sanityCheck = require('./SanityCheck');
SIP.DigestAuthentication = require('./DigestAuthentication');
SIP.Grammar = require('./Grammar/dist/Grammar');
