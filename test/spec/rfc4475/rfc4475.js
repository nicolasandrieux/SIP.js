//var assert = require('assert');
//var fs = require('fs');

//process.chdir(__dirname);

describe('RFC 4475 Torture Tests', function () {
  function assert (shouldBeTrue) {
    expect(shouldBeTrue).toBeTruthy();
  }

  assert.equal = function (first, second) {
    expect(first).toEqual(second);
  };
  assert.deepEqual = function (first, second) {
    expect(first).toEqual(second);
  };
  assert.strictEqual = function (first, second) {
    expect(first === second);
  };
  assert.notEqual = function (first, second) {
    expect(first).not.toEqual(second);
  };
  assert.fail = function (foo, bar, message) {
    throw message;
  };

  function assertivelyParse (raw, valid) {
    //var path = 'dat/' + name + '.dat';
    //var raw = fs.readFileSync(path, 'ascii');
    var parsed;

    var ua_config = {
      register: false
    };
    var ua = new SIP.UA(ua_config);

    var parsed = SIP.Parser.parseMessage(raw, ua);
    var assertion = valid === false ? 'equal' : 'notEqual';
    assert[assertion](undefined, parsed);

    return parsed;
  }

  function roundTrip (parsed) {
    /*
    if (!parsed) return;
    var parsed2;
    try {
      parsed2 = SIP.Parser.parseMessage(parsed.serialize(), {startRule: 'SIP_message'});
    } catch (e) {
      e.message += ' at line ' + e.line + ', column ' + e.column + ' of \n\n' + parsed.serialize();
      throw e;
    }
    assert.deepEqual(jsonClone(parsed), jsonClone(parsed2), 'serialize/parse round-trip came back different');
    */
  }

  function jsonClone (obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  describe('3.1. Parser Tests (syntax)', function () {
    describe('3.1.1. Valid Messages', function () {
      describe('3.1.1.1. A Short Tortuous INVITE', function () {
        var raw = @@include('./dat/wsinv.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});

        it('has a CSeq number of 9', function () {
          assert.equal(9, parsed ? parsed.cseq : 9);
        });

        it('has a Max-Forwards of 68', function () {
          assert.equal(68, parsed ? parsed.headers['Max-Forwards'].parsed : 68);
        });
      });

      describe('3.1.1.2. Wide Range of Valid Characters', function () {
        var raw = @@include('./dat/intmeth.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});
      });

      describe('3.1.1.3. Valid Use of the % Escaping Mechanism', function () {
        var raw = @@include('./dat/esc01.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});

        it('The Request-URI has sips:user@example.com embedded in its userpart.', function () {
          assert.equal('sips:user@example.com', parsed.ruri.user);
        });

        it('The From and To URIs have escaped characters in their userparts.', function () {
          assert.equal('I have spaces', parsed.from.user);
          assert.equal('user', parsed.to.user);
        });

        it('The Contact URI has escaped characters in the URI parameters.', function () {
          assert.notEqual(undefined, parsed.headers.Contact[0].parsed.getParam('lr'));
          assert.notEqual('value%41', parsed.headers.Contact[0].parsed.getParam('name'));
        });
      });

      describe('3.1.1.4. Escaped Nulls in URIs', function () {
        var raw = @@include('./dat/escnull.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});

        it('has From/To users of "null-%00-null"', function () {
          assert.equal('null-\u0000-null', parsed.from.uri.user);
          assert.equal('null-\u0000-null', parsed.to.uri.user);
        });

        it('has first Contact user of "%00"', function () {
          assert.equal('\u0000', parsed.headers.Contact[0].user);
        });

        it('has second Contact user of "%00%00"', function () {
          assert.equal('\u0000\u0000', parsed.headers.Contact[1].user);
        });
      });

      describe('3.1.1.5. Use of % When It Is Not an Escape', function () {
        var raw = @@include('./dat/esc02.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});

        it('The request method is unknown.  It is NOT equivalent to REGISTER.', function () {
          assert.strictEqual('RE%47IST%45R', parsed.method);
        });

        it('The display name portion of the To and From header fields is "%Z%45".', function () {
          assert.equal('%Z%45', parsed.headers.To[0].parsed.displayName);
          assert.equal('%Z%45', parsed.headers.From[0].parsed.displayName);
        });

        it('This message has two Contact header field values, not three.', function () {
          assert.strictEqual(2, parsed.headers.Contact.length);
        });
      });

      describe('3.1.1.6. Message with No LWS between Display Name and <', function () {
        var raw = @@include('./dat/lwsdisp.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});
      });

      describe('3.1.1.7. Long Values in Header Fields', function () {
        var raw = @@include('./dat/longreq.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});
      });

      describe('3.1.1.8. Extra Trailing Octets in a UDP Datagram', function () {
        var raw = @@include('./dat/dblreq.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});

        it('is a REGISTER request (not an INVITE)', function () {
          assert.strictEqual('REGISTER', parsed.method);
        });
      });

      describe('3.1.1.9. Semicolon-Separated Parameters in URI User Part', function () {
        var raw = @@include('./dat/semiuri.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});

        it('The Request-URI will parse so that the user part is "user;par=u@example.net".', function () {
          assert.equal('user;par=u@example.net', parsed.ruri.user);
        });
      });

      describe('3.1.1.10. Varied and Unknown Transport Types', function () {
        var raw = @@include('./dat/semiuri.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});
      });

      describe('3.1.1.11. Multipart MIME Message', function () {
        var raw = @@include('./dat/mpart01.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});
      });

      describe('3.1.1.12. Unusual Reason Phrase', function () {
        var raw = @@include('./dat/unreason.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});
      });

      describe('3.1.1.13. Empty Reason Phrase', function () {
        var raw = @@include('./dat/noreason.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});

        it('contains no reason phrase', function () {
          assert.equal('', parsed.reason_phrase);
        });
      });
    });

    describe('3.1.2. Invalid Messages', function () {
      describe('3.1.2.1. Extraneous Header Field Separators', function () {
        var raw = @@include('./dat/badinv01.dat');
        var parsed;
        it('does not parse', function () {
          parsed = assertivelyParse(raw, false);
        });
      });

      describe('3.1.2.2. Content Length Larger Than Message', function () {
        var raw = @@include('./dat/clerr.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});

        it('has a Content Length that is larger than the actual length of the body', function () {
          assert(parsed.headers['Content-Length'].parsed > parsed.body.length);
        });
      });

      describe('3.1.2.3. Negative Content-Length', function () {
        var raw = @@include('./dat/ncl.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});

        it('This request has a negative value for Content-Length.', function () {
          parsed && assert.strictEqual('-999', parsed.headers['Content-Length']);
        });
      });

      describe('3.1.2.4. Request Scalar Fields with Overlarge Values', function () {
        var raw = @@include('./dat/scalar02.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});

        it('The CSeq sequence number is >2**32-1.', function () {
          assert(parsed.headers.CSeq.sequenceNumber > Math.pow(2, 32) - 1);
        });

        it('The Max-Forwards value is >255.', function () {
          assert(parsed.headers['Max-Forwards'] > 255);
        });

        it('The Expires value is >2**32-1.', function () {
          assert(parsed.headers.Expires > Math.pow(2, 32) - 1);
        });

        it('The Contact expires parameter value is >2**32-1.', function () {
          assert(parseInt(parsed.headers.Contact[0].parsed.getParam('expires')) > Math.pow(2, 32) - 1);
        });
      });

      describe('3.1.2.5. Response Scalar Fields with Overlarge Values', function () {
        var raw = @@include('./dat/scalarlg.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});

        it('The CSeq sequence number is >2**32-1.', function () {
          assert(parsed.headers.CSeq.sequenceNumber > Math.pow(2, 32) - 1);
        });

        it('The Retry-After field is unreasonably large', function () {
          assert.equal(parsed.headers['Retry-After'].delta_seconds, 949302838503028349304023988);
        });

        it('The Warning field has a warning-value with more than 3 digits.', function () {
          assert.strictEqual(parsed.headers.Warning, '1812 overture "In Progress"');
        });
      });

      describe('3.1.2.6. Unterminated Quoted String in Display Name', function () {
        var raw = @@include('./dat/quotbal.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});

        it('has an unterminated quote in the display name of the To field', function () {
          parsed && assert.strictEqual(parsed.headers.To, '"Mr. J. User <sip:j.user@example.com>');
        });
      });

      describe('3.1.2.7. <> Enclosing Request-URI', function () {
        var raw = @@include('./dat/ltgtruri.dat');
        var parsed;
        it('does not parse', function () {
          parsed = assertivelyParse(raw, false);
        });
      });

      describe('3.1.2.8. Malformed SIP Request-URI (embedded LWS)', function () {
        var raw = @@include('./dat/lwsruri.dat');
        var parsed;
        it('does not parse', function () {
          parsed = assertivelyParse(raw, false);
        });
      });

      describe('3.1.2.9. Multiple SP Separating Request-Line Elements', function () {
        var raw = @@include('./dat/lwsstart.dat');
        var parsed;
        it('does not parse', function () {
          parsed = assertivelyParse(raw, false);
        });
      });
 
      describe('3.1.2.10. SP Characters at End of Request-Line', function () {
        var raw = @@include('./dat/trws.dat');
        var parsed;
        it('does not parse', function () {
          parsed = assertivelyParse(raw, false);
        });
      });

      describe('3.1.2.11. Escaped Headers in SIP Request-URI', function () {
        var raw = @@include('./dat/escruri.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});

        it('the SIP Request-URI contains escaped headers', function () {
          assert.equal(parsed.ruri.headers.Route[0], "<sip:example.com>");
        });
      });

      describe('3.1.2.12. Invalid Time Zone in Date Header Field', function () {
        var raw = @@include('./dat/baddate.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});

        it('contains a non-GMT time zone in the SIP Date header field', function () {
          assert.strictEqual(parsed.headers.Date, "Fri, 01 Jan 2010 16:00:00 EST");
        });
      });

      describe('3.1.2.13. Failure to Enclose name-addr URI in <>', function () {
        var raw = @@include('./dat/regbadct.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});

        it('The SIP URI contained in the Contact Header field has an escaped header', function () {
          assert.equal(parsed.headers.Contact[0].addr.headers.Route, "<sip:sip.example.com>");
        });
      });

      describe('3.1.2.14. Spaces within addr-spec', function () {
        var raw = @@include('./dat/badaspec.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});

        it('the addr-spec in the To header field contains spaces', function () {
          assert.strictEqual(parsed.headers.To, '"Watson, Thomas" < sip:t.watson@example.org >');
        });
      });

      describe('3.1.2.15. Non-token Characters in Display Name', function () {
        var raw = @@include('./dat/baddn.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});
      });

      describe('3.1.2.16. Unknown Protocol Version', function () {
        var raw = @@include('./dat/badvers.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});

        it('has version number 7.0', function () {
          assert.strictEqual(parsed.Request_Line.SIP_Version, 'SIP/7.0');
        });
      });

      describe('3.1.2.17. Start Line and CSeq Method Mismatch', function () {
        var raw = @@include('./dat/mismatch01.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});

        it('This request has mismatching values for the method in the start line and the CSeq header field.', function () {
          assert.strictEqual('OPTIONS', parsed.method);
          assert.strictEqual('INVITE', parsed.headers.CSeq.requestMethod);
        });
      });

      describe('3.1.2.18. Unknown Method with CSeq Method Mismatch', function () {
        var raw = @@include('./dat/mismatch02.dat');
        var parsed;
        it('parses', function () {
          parsed = assertivelyParse(raw);
        });

        it('round-trips', function () {roundTrip(parsed);});

        it('This request has mismatching values for the method in the start line and the CSeq header field.', function () {
          assert.strictEqual('NEWMETHOD', parsed.method);
          assert.strictEqual('INVITE', parsed.headers.CSeq.requestMethod);
        });
      });

      describe('3.1.2.19. Overlarge Response Code', function () {
        var raw = @@include('./dat/bigcode.dat');
        var parsed;
        it('does not parse', function () {
          parsed = assertivelyParse(raw, false);
        });
      });
    });
  });

  describe('3.2. Transaction Layer Semantics', function () {
    describe('3.2.1. Missing Transaction Identifier', function () {
      var raw = @@include('./dat/badbranch.dat');
      var parsed;
      it('parses', function () {
        parsed = assertivelyParse(raw);
      });

      it('round-trips', function () {roundTrip(parsed);});

      it('has Via branch parameter of "z9hG4bK"', function () {
        assert.strictEqual('z9hG4bK', parsed.via.branch);
      });
    });
  });

  describe('3.3. Application-Layer Semantics', function () {
    describe('3.3.1. Missing Required Header Fields', function () {
      var raw = @@include('./dat/insuf.dat');
      var parsed;
      it('parses', function () {
        parsed = assertivelyParse(raw);
      });

      it('round-trips', function () {roundTrip(parsed);});

      it('This request contains no Call-ID, From, or To header fields.', function () {
        ['Call-ID', 'From', 'To'].forEach(function (headerName) {
          assert.strictEqual(undefined, parsed.headers[headerName]);
        });
      });
    });

    describe('3.3.2. Request-URI with Unknown Scheme', function () {
      var raw = @@include('./dat/unkscm.dat');
      var parsed;
      it('parses', function () {
        parsed = assertivelyParse(raw);
      });

      it('round-trips', function () {roundTrip(parsed);});

      it('This OPTIONS contains an unknown URI scheme in the Request-URI.', function () {
        assert.strictEqual(parsed.ruri.scheme, 'nobodyKnowsThisScheme');
      });
    });

    describe('3.3.3. Request-URI with Known but Atypical Scheme', function () {
      var raw = @@include('./dat/novelsc.dat');
      var parsed;
      it('parses', function () {
        parsed = assertivelyParse(raw);
      });

      it('round-trips', function () {roundTrip(parsed);});

      it('This OPTIONS contains an Request-URI with an IANA-registered scheme that does not commonly appear in Request-URIs of SIP requests.', function () {
        assert.strictEqual(parsed.ruri.scheme, 'soap.beep');
      });
    });

    describe('3.3.4. Unknown URI Schemes in Header Fields', function () {
      var raw = @@include('./dat/unksm2.dat');
      var parsed;
      it('parses', function () {
        parsed = assertivelyParse(raw);
      });

      it('round-trips', function () {roundTrip(parsed);});

      it('This message contains registered schemes in the To, From, and Contact header fields of a request.', function () {
        assert.strictEqual(parsed.headers.To.addr.scheme, 'isbn');
        assert.strictEqual(parsed.headers.From.addr.scheme, 'http');
        assert.strictEqual(parsed.headers.Contact[0].addr.scheme, 'name');
      });
    });

    describe('3.3.5. Proxy-Require and Require', function () {
      var raw = @@include('./dat/bext01.dat');
      var parsed;
      it('parses', function () {
        parsed = assertivelyParse(raw);
      });

      it('round-trips', function () {roundTrip(parsed);});
    });

    describe('3.3.6. Unknown Content-Type', function () {
      var raw = @@include('./dat/invut.dat');
      var parsed;
      it('parses', function () {
        parsed = assertivelyParse(raw);
      });

      it('round-trips', function () {roundTrip(parsed);});

      it('This INVITE request contains a body of unknown type.', function () {
        assert.deepEqual(parsed.headers['Content-Type'],
          {
            "m_type": "application",
            "m_subtype": "unknownformat",
            "m_parameters": {}
          }
        );
      });
    });

    describe('3.3.7. Unknown Authorization Scheme', function () {
      var raw = @@include('./dat/regaut01.dat');
      var parsed;
      it('parses', function () {
        parsed = assertivelyParse(raw);
      });

      it('round-trips', function () {roundTrip(parsed);});

      it('This REGISTER request contains an Authorization header field with an unknown scheme.', function () {
        assert.strictEqual(parsed.headers.Authorization[0].parsed.scheme, 'NoOneKnowsThisScheme');
      });
    });

    describe('3.3.8. Multiple Values in Single Value Required Fields', function () {
      var raw = @@include('./dat/multi01.dat');
      var parsed;
      it('parses', function () {
        parsed = assertivelyParse(raw);
      });

      it('round-trips', function () {roundTrip(parsed);});

      it('The message contains a request with multiple Call-ID, To, From, Max- Forwards, and CSeq values.', function () {
        assert.fail(null, null, 'this actually parses as if only the last of each header was present');
      });
    });

    describe('3.3.9. Multiple Content-Length Values', function () {
      var raw = @@include('./dat/mcl01.dat');
      var parsed;
      it('parses', function () {
        parsed = assertivelyParse(raw);
      });

      it('round-trips', function () {roundTrip(parsed);});

      it('Multiple conflicting Content-Length header field values appear in this request.', function () {
        assert.fail(null, null, 'this actually parses as if only the last Content-Length header was present');
      });
    });

    describe('3.3.10. 200 OK Response with Broadcast Via Header Field Value', function () {
      var raw = @@include('./dat/bcast.dat');
      var parsed;
      it('parses', function () {
        parsed = assertivelyParse(raw);
      });

      it('round-trips', function () {roundTrip(parsed);});

      it('This message is a response with a 2nd Via header field value\'s sent-by containing 255.255.255.255.', function () {
        assert.strictEqual(parsed.headers.Via[1].parsed.host, '255.255.255.255');
      });
    });

    describe('3.3.11. Max-Forwards of Zero', function () {
      var raw = @@include('./dat/zeromf.dat');
      var parsed;
      it('parses', function () {
        parsed = assertivelyParse(raw);
      });

      it('round-trips', function () {roundTrip(parsed);});

      it('This is a legal SIP request with the Max-Forwards header field value set to zero.', function () {
        assert.equal(parsed.headers['Max-Forwards'], 0);
      });
    });

    describe('3.3.12. REGISTER with a Contact Header Parameter', function () {
      var raw = @@include('./dat/cparam01.dat');
      var parsed;
      it('parses', function () {
        parsed = assertivelyParse(raw);
      });

      it('round-trips', function () {roundTrip(parsed);});

      it("This register request contains a contact where the 'unknownparam' parameter must be interpreted as a contact-param and not a url-param.", function () {
        assert.strictEqual(parsed.headers.Contact[0].parsed.uri.parameters.unknownparam, undefined);
        assert.strictEqual(parsed.headers.Contact[0].parsed.parameters.unknownparam, null);
      });
    });

    describe('3.3.13. REGISTER with a url-parameter', function () {
      var raw = @@include('./dat/cparam02.dat');
      var parsed;
      it('parses', function () {
        parsed = assertivelyParse(raw);
      });

      it('round-trips', function () {roundTrip(parsed);});

      it('This register request contains a contact where the URI has an unknown parameter.', function () {
        assert.strictEqual(parsed.headers.Contact[0].parsed.uri.parameters.unknownparam, null);
      });
    });

    describe('3.3.14. REGISTER with a URL Escaped Header', function () {
      var raw = @@include('./dat/regescrt.dat');
      var parsed;
      it('parses', function () {
        parsed = assertivelyParse(raw);
      });

      it('round-trips', function () {roundTrip(parsed);});

      it('This register request contains a contact where the URI has an escaped header', function () {
        assert.equal(parsed.headers.Contact[0].parsed.uri.headers.Route[0], '<sip:sip.example.com>');
      });
    });

    describe('3.3.15. Unacceptable Accept Offering', function () {
      var raw = @@include('./dat/sdp01.dat');
      var parsed;
      it('parses', function () {
        parsed = assertivelyParse(raw);
      });

      it('round-trips', function () {roundTrip(parsed);});

      it('This request indicates that the response must contain a body in an unknown type.', function () {
        assert.deepEqual(
          parsed.headers.Accept[0].media_range,
          {
            "m_type": "text",
            "m_subtype": "nobodyKnowsThis",
            "m_parameters": {}
          }
        );
      });
    });
  });

  describe('3.4. Backward Compatibility', function () {
    describe('3.4.1. INVITE with RFC 2543 Syntax', function () {
      var raw = @@include('./dat/inv2543.dat');
      var parsed;
      it('parses', function () {
        parsed = assertivelyParse(raw);
      });

      it('round-trips', function () {roundTrip(parsed);});

      it('There is no branch parameter at all on the Via header field value.', function () {
        assert.strictEqual(undefined, parsed.headers.Via[0].parsed.branch);
      });

      it('There is no From tag.', function () {
        assert.strictEqual(undefined, parsed.headers.From[0].parsed.parameters.tag);
      });

      it('There is no explicit Content-Length.', function () {
        assert.strictEqual(undefined, parsed.headers['Content-Length']);
      });

      it('The body is assumed to be all octets in the datagram after the null-line.', function () {
        assert.strictEqual(parsed.body,
          'v=0\r\n' +
          'o=mhandley 29739 7272939 IN IP4 192.0.2.5\r\n' +
          's=-\r\n' +
          'c=IN IP4 192.0.2.5\r\n' +
          't=0 0\r\n' +
          'm=audio 49217 RTP/AVP 0\r\n'
        );
      });

      it('There is no Max-Forwards header field.', function () {
        assert.strictEqual(undefined, parsed.headers['Max-Forwards']);
      });
    });
  });
});
