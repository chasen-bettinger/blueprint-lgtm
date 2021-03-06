// Generated by CoffeeScript 1.9.2
(function() {
  var Auth, Promise, crypto,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Promise = require('bluebird');


  /*
  {pbkdf2, randomBytes}= require 'crypto'
  crypto=
  	pbkdf2: Promise.promisify pbkdf2
  	randomBytes: Promise.promisify randomBytes
   */

  crypto = require('crypto');

  crypto.p_pbkdf2 = Promise.promisify(crypto.pbkdf2, {
    context: crypto
  });

  crypto.p_randomBytes = Promise.promisify(crypto.randomBytes, {
    context: crypto
  });

  Auth = (function() {
    Auth.deps = {
      services: ['error', 'config', 'tokenMgr'],
      config: ['auth[key,bearer,basic.api_keys,pbkdf2[iterations,salt_size,key_length]]'],
      mysql: ['auth']
    };

    function Auth(kit) {
      this.server_use = bind(this.server_use, this);
      this.sdb = kit.services.db.mysql;
      this.E = kit.services.error;
      this.config = kit.services.config.auth;
      this.tokenMgr = kit.services.tokenMgr;
      this.pwd_col = this.sdb.auth.pwd_col;
      this.ITERATIONS = this.config.pbkdf2.iterations;
      this.SALT_SIZE = this.config.pbkdf2.salt_size;
      this.KEY_LENGTH = this.config.pbkdf2.key_length;
    }

    Auth.prototype._pbkdf2 = function(p, buf, IT, KL) {
      return crypto.p_pbkdf2(p, buf, IT, KL, 'sha1');
    };

    Auth.prototype.server_use = function(req, res, next) {
      var authHeader, h, p, result, token;
      p = req.params;
      h = req.headers;
      authHeader = false;
      token = false;
      result = false;
      if (h.authorization) {
        authHeader = h.authorization.split(' ', 2);
      }
      token = (authHeader != null ? authHeader.length : void 0) === 2 && authHeader[0].toLowerCase() === 'bearer' ? authHeader[1] : p.auth_token;
      result = token ? this.tokenMgr.decodeAndValidate(token, this.config.key) : {
        error: 'Missing or invalid authorization header'
      };
      req.auth = {
        message: result.error,
        token: result.token,
        authId: result.token ? result.token.iid : null,
        tenant: result.token ? result.token.itenant : null,
        role: result.token ? result.token.irole : null,
        authorize: (function(_this) {
          return function(skip_response) {
            var error;
            if (!req.auth.authId) {
              if (skip_response) {
                return false;
              }
              error = new _this.E.OAuthError(401, 'invalid_token', req.auth.message);
              res.setHeader('WWW-Authenticate', "Bearer realm=\"" + _this.config.bearer + "\"");
              res.send(error);
              return false;
            } else {
              return true;
            }
          };
        })(this)
      };
      return next();
    };

    Auth.prototype.AuthenticateBasicAuthHeader = function(req) {
      var api_keys, auth, f, ref, ref1, ref2;
      f = 'Auth:AuthenticateBasicAuthHeader:';
      auth = req.authorization;
      api_keys = this.config.basic.api_keys;
      if (auth.scheme !== 'Basic') {
        return 'invalid_scheme';
      }
      if (!(((ref = auth.basic) != null ? ref.username : void 0) in api_keys)) {
        return 'invalid_api_key';
      }
      if (((ref1 = auth.basic) != null ? ref1.password : void 0) !== ((ref2 = api_keys[auth.basic.username]) != null ? ref2.password : void 0)) {
        return 'invalid_password';
      }
      return true;
    };

    Auth.prototype.ValidateCredentials = function(ctx, username, password) {
      var creds, f;
      f = 'Auth:_ValidateCredentials:';
      creds = false;
      return Promise.resolve().bind(this).then(function() {
        return this.sdb.auth.GetAuthCreds(ctx, username);
      }).then(function(db_rows) {
        if (db_rows.length !== 1 || !db_rows[0][this.pwd_col]) {
          throw new this.E.OAuthError(401, 'invalid_client');
        }
        creds = db_rows[0];
        return this.ComparePassword(password, creds[this.pwd_col]);
      }).then(function(a_match) {
        if (!a_match) {
          throw new this.E.OAuthError(401, 'invalid_client');
        }
        return {
          id: creds.id,
          tenant: creds.tenant,
          role: creds.role
        };
      });
    };

    Auth.prototype.ComparePassword = function(password, compareHash) {
      var f, parts;
      f = 'Auth:ComparePassword:';
      parts = compareHash.split('.', 2);
      if (parts.length !== 2) {
        throw new this.E.ServerError('auth_error', 'Missing salt on password hash');
      }
      return (this._pbkdf2(password, new Buffer(parts[0], 'base64'), this.ITERATIONS, this.KEY_LENGTH)).then(function(key) {
        if ((new Buffer(key).toString('base64')) === parts[1]) {
          return true;
        } else {
          return false;
        }
      });
    };

    Auth.prototype.EncryptPassword = function(password) {
      var saltBuf;
      saltBuf = false;
      return Promise.resolve().bind(this).then(function() {
        return crypto.p_randomBytes(this.SALT_SIZE);
      }).then(function(buffer) {
        saltBuf = buffer;
        return this._pbkdf2(password, saltBuf, this.ITERATIONS, this.KEY_LENGTH);
      }).then(function(key) {
        return (saltBuf.toString('base64')) + '.' + new Buffer(key).toString('base64');
      });
    };

    return Auth;

  })();

  exports.Auth = Auth;

}).call(this);
