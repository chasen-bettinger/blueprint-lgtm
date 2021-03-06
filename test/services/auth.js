// Generated by CoffeeScript 1.9.2
(function() {
  var Auth, E, Kit, Mock, TokenMgr, Util, _, _log, chai, config, encryptedPassword, kit, mockDb, moment, pChai, req;

  _ = require('lodash');

  moment = require('moment');

  chai = require('chai');

  pChai = require('chai-as-promised');

  Util = require('../lib/Util');

  Mock = require('../lib/Mock');

  Kit = require('../../lib/kit').Kit;

  TokenMgr = require('../../lib/token_manager').TokenMgr;

  Auth = require('../../lib/auth').Auth;

  E = require('../../lib/error');

  chai.use(pChai);

  chai.should();

  encryptedPassword = 'xfGuZKjVkoNgQyXxYT8+Hg==.f+uw2I+dqzfOE4O82Znikrbdb0lOONBxl/xcWGsQtFI=';

  config = {
    auth: {
      key: 'KaJ14yi78x',
      pbkdf2: {
        iterations: 150000,
        salt_size: 16,
        key_length: 32
      },
      bearer: 'blueprint',
      accessTokenExpiration: 10 * 60
    }
  };

  mockDb = {
    mysql: {
      auth: {
        pwd_col: 'pwd',
        cred_col: 'eml',
        GetAuthCreds: function(ctx, username) {
          return [
            {
              id: 42,
              eml: 'test@email.com',
              pwd: encryptedPassword
            }
          ];
        }
      }
    }
  };

  kit = new Kit;

  kit.add_service('logger', {
    log: {
      debug: console.log
    }
  });

  kit.add_service('config', config);

  kit.add_service('db', mockDb);

  kit.new_service('tokenMgr', TokenMgr);

  kit.add_service('error', E);

  kit.new_service('auth', Auth);

  _log = console.log;

  req = new Mock.RestifyRequest({
    url: 'localhost/api',
    params: {
      p1: 'p1',
      p2: 'p2'
    }
  });

  describe('Auth Service', function() {
    var auth;
    auth = kit.services.auth;
    it('should Encrypt passwords using variable salt', function() {
      var hash1, hash2, salt1, salt2;
      salt1 = false;
      hash1 = false;
      salt2 = false;
      hash2 = false;
      return (auth.EncryptPassword('password')).then(function(encryption) {
        var ref;
        ref = encryption.split('.'), salt1 = ref[0], hash1 = ref[1];
        return auth.EncryptPassword('password');
      }).then(function(encryption) {
        var ref;
        ref = encryption.split('.'), salt2 = ref[0], hash2 = ref[1];
        salt1.should.not.equal(salt2);
        return hash1.should.not.equal(hash2);
      });
    });
    it('should tell if a password matches an encrytped hash', function() {
      (auth.ComparePassword('password', encryptedPassword)).should.eventually.be["true"];
      (auth.ComparePassword('password1', encryptedPassword)).should.eventually.be["false"];
      return (auth.ComparePassword('password', encryptedPassword + 'BROKEN')).should.eventually.be["false"];
    });
    it('should validate a username and password combination', function() {
      return (auth.ValidateCredentials({}, 'test@email.com', 'password')).should.eventually.deep.equal({
        id: 42,
        role: void 0,
        tenant: void 0
      });
    });
    return describe('server_use', function() {
      var expired_token, future, good_token, user_data;
      future = moment().add(config.auth.accessTokenExpiration, 'seconds');
      user_data = {
        iid: 42,
        some: 'thing',
        other: 'that'
      };
      good_token = kit.services.tokenMgr.encode(user_data, future, config.auth.key);
      expired_token = kit.services.tokenMgr.encode({
        iid: 42
      }, moment(), config.auth.key);
      it('should parse an Authorization Header', function() {
        req = new Mock.RestifyRequest({
          headers: {
            authorization: "Bearer " + good_token
          }
        });
        req.next_called = false;
        auth.server_use(req, {}, function() {
          return req.next_called = true;
        });
        req.should.have.property('auth');
        req.auth.should.have.property('token');
        req.auth.should.have.property('authId');
        req.auth.should.respondTo('authorize');
        req.auth.token.should.deep.equal(user_data);
        req.auth.authId.should.equal(42);
        return req.next_called.should.be["true"];
      });
      it('should parse the query param "auth_token"', function() {
        req = new Mock.RestifyRequest({
          params: {
            auth_token: "" + good_token
          }
        });
        req.next_called = false;
        auth.server_use(req, {}, function() {
          return req.next_called = true;
        });
        req.should.have.property('auth');
        req.auth.should.have.property('token');
        req.auth.should.have.property('authId');
        req.auth.should.respondTo('authorize');
        req.auth.token.should.deep.equal(user_data);
        req.auth.authId.should.equal(42);
        return req.next_called.should.be["true"];
      });
      return describe('authorize()', function() {
        it('should be true for authorized requests', function() {
          req = new Mock.RestifyRequest({
            params: {
              auth_token: "" + good_token
            }
          });
          auth.server_use(req, {}, function() {});
          return req.auth.authorize().should.be["true"];
        });
        it('should be false for an un-authorized request', function() {
          var skip;
          req = new Mock.RestifyRequest({
            params: {
              auth_token: "" + expired_token
            }
          });
          auth.server_use(req, {}, function() {});
          return req.auth.authorize(skip = true).should.be["false"];
        });
        return it('should respond with 401 for an un-authorized request', function() {
          var res;
          req = new Mock.RestifyRequest({
            params: {
              auth_token: "" + expired_token
            }
          });
          res = new Mock.RestifyResponse;
          auth.server_use(req, res, function() {});
          req.auth.authorize();
          res.headers.should.have.property('WWW-Authenticate');
          res.data.name.should.equal('OAuthError');
          res.data.statusCode.should.equal(401);
          return res.data.body.error.should.equal('invalid_token');
        });
      });
    });
  });

}).call(this);
