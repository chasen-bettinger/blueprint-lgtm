// Generated by CoffeeScript 1.9.2
(function() {
  var KEY, Kit, TokenMgr, _, _log, accessTokenExpiration, chai, kit, moment, urlUnSafe;

  _ = require('lodash');

  moment = require('moment');

  chai = require('chai');

  Kit = require('../../lib/kit').Kit;

  TokenMgr = require('../../lib/token_manager').TokenMgr;

  chai.should();

  kit = new Kit;

  kit.add_service('logger', {
    log: {
      debug: console.log
    }
  });

  kit.new_service('TokenMgr', TokenMgr);

  _log = console.log;

  KEY = 'KaJ14yi78x';

  urlUnSafe = /\+|\/|\=/;

  accessTokenExpiration = 100;

  describe('Token Manager', function() {
    var exp, good_token, tkmgr;
    tkmgr = kit.services.TokenMgr;
    good_token = false;
    exp = false;
    it('should create a Url Safe Base 64 Encoded String', function(done) {
      return tkmgr.createToken(16, function(err, token) {
        var buffer, unsafe;
        _.isNull(err).should.be["true"];
        buffer = new Buffer(token, 'base64');
        buffer.length.should.equal(16);
        unsafe = urlUnSafe.test(token);
        unsafe.should.be["false"];
        return done();
      });
    });
    it('should encode an object and exp date in to a URL Safe access token', function() {
      var parts, unsafe;
      exp = moment().add(accessTokenExpiration, 'seconds');
      good_token = tkmgr.encode({
        id: 42
      }, exp, KEY);
      parts = good_token.split('.', 2);
      parts.length.should.equal(2);
      unsafe = urlUnSafe.test(good_token);
      return unsafe.should.be["false"];
    });
    it('should decode a non-expired access token', function() {
      var result;
      result = tkmgr.decodeAndValidate(good_token, KEY);
      result.should.have.property('token');
      result.token.should.have.property('id');
      result.token.should.have.property('exp');
      result.token.id.should.equal(42);
      return result.token.exp.should.equal(exp.unix());
    });
    it('should return an error when decoding a bad access token', function() {
      var parts, result;
      result = tkmgr.decodeAndValidate(good_token + 'BROKEN', KEY);
      result.should.have.property('error');
      result.error.should.equal('Bad Signature');
      parts = good_token.split('.');
      result = tkmgr.decodeAndValidate(parts[0], KEY);
      result.should.have.property('error');
      return result.error.should.equal('Bad Format');
    });
    return it('should return an error when decoding an expired access token', function(done) {
      var expSecs, expiring_token, result;
      expSecs = 1;
      expiring_token = tkmgr.encode({
        id: 42
      }, moment().add(expSecs, 'seconds'), KEY);
      result = tkmgr.decodeAndValidate(expiring_token, KEY);
      result.should.have.property('token');
      result.token.should.have.property('id');
      result.token.should.have.property('exp');
      return setTimeout(function() {
        result = tkmgr.decodeAndValidate(expiring_token, KEY);
        result.should.have.property('error');
        result.error.should.equal('Token Expired');
        return done();
      }, expSecs * 1000 + 1000);
    });
  });

}).call(this);
