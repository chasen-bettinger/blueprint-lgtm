// Generated by CoffeeScript 1.9.2

/*
Test Suite for Sql Token
 */

(function() {
  var Kit, Logger, SqlCore, SqlToken, Util, _log, chai, config, kit, moment, rename;

  chai = require('chai');

  moment = require('moment');

  Util = require('../../lib/Util');

  Kit = require('../../../lib/kit').Kit;

  Logger = require('../../../lib/logger').Logger;

  SqlCore = require('../../../lib/db/_mysql/sql_core').SqlCore;

  SqlToken = require('../../../lib/db/_mysql/sql_token').SqlToken;

  chai.should();

  config = Util.config;

  rename = Util.rename;

  kit = new Kit;

  kit.add_service('config', config);

  kit.add_service('error', {});

  kit.new_service('logger', Logger);

  _log = kit.services.logger.log;


  /*
  class SqlToken
  	constructor: (@core, kit)-> (logger.log)
  	Create: (ctx, new_values, reread)-> (token,ident_id,client_id,expires)
  	GetNonExpiredToken: (ctx, token)->
  	UpdateActiveToken: (ctx, user_id, clientId, expires, new_token, current_ident_token)=>
   */

  describe('Sql Token Module', function() {
    var core, exp_rec, exp_token, the_token, tokenDb, valid_rec, valid_token;
    core = new SqlCore(kit, config.db.mysql.pool);
    tokenDb = false;
    the_token = rename('SECRET_TOKEN');
    valid_token = rename('VALID_TOKEN');
    exp_token = rename('EXP_TOKEN');
    valid_rec = false;
    exp_rec = false;
    before(function() {
      var valid_vals;
      valid_vals = {
        token: valid_token,
        ident_id: Util.test_ident_id,
        client: 'TEST_FRAMEWORK',
        exp: (moment().add(config.auth.refreshTokenExpiration, 'seconds')).toDate()
      };
      return (Util.db.InsertOne('ident_tokens', valid_vals)).then(function(token_rec) {
        var exp_vals;
        valid_rec = token_rec;
        exp_vals = {
          token: exp_token,
          ident_id: Util.test_ident_id,
          client: 'TEST_FRAMEWORK',
          exp: moment('2014-10-15').toDate()
        };
        return Util.db.InsertOne('ident_tokens', exp_vals);
      }).then(function(token_rec) {
        return exp_rec = token_rec;
      });
    });
    after(function() {});
    it('should be instantiated', function(done) {
      tokenDb = new SqlToken(core, kit);
      tokenDb.should.be.instanceOf(SqlToken);
      return done();
    });
    it('should use the ident_tokens table', function() {
      tokenDb.should.have.property('table');
      return tokenDb.table.should.equal('ident_tokens');
    });
    it('should create an ident_token using token, ident_id, client and exp', function() {
      var ctx, ident_token, new_values;
      ctx = {
        conn: null,
        log: _log
      };
      new_values = {};
      ident_token = false;
      return (core.Acquire()).then(function(c) {
        var re_read;
        ctx.conn = c;
        new_values = {
          token: the_token,
          ident_id: Util.test_ident_id,
          client: 'TEST_FRAMEWORK',
          exp: (moment().add('seconds', config.refreshTokenExpiration)).toDate()
        };
        return tokenDb.Create(ctx, new_values, re_read = true);
      }).then(function(new_rec) {
        ident_token = new_rec;
        ident_token.token.should.equal(new_values.token);
        ident_token.ident_id.should.equal(Util.test_ident_id);
        ident_token.client.should.equal(new_values.client);
        ident_token.exp.toString().should.equal(new_values.exp.toString());
        return Util.db.GetByKey(ctx, 'ident_tokens', 'token', [new_values.token]);
      }).then(function(db_rows) {
        db_rows.length.should.equal(1);
        db_rows[0].token.should.equal(new_values.token);
        db_rows[0].ident_id.should.equal(Util.test_ident_id);
        db_rows[0].client.should.equal(new_values.client);
        db_rows[0].exp.toString().should.equal(new_values.exp.toString());
        return core.release(ctx.conn);
      })["catch"](function(err) {
        _log.error({
          err: err
        });
        if (ctx.conn !== null) {
          core.release(ctx.conn);
        }
        throw err;
      });
    });
    it('should not allow identical tokens to be inserted', function() {
      var ctx, ident_token, new_values;
      ctx = {
        conn: null,
        log: _log
      };
      new_values = {};
      ident_token = false;
      return (core.Acquire()).then(function(c) {
        var re_read;
        ctx.conn = c;
        new_values = {
          token: the_token,
          ident_id: Util.test_ident_id,
          client: 'TEST_FRAMEWORK',
          exp: (moment().add('seconds', config.refreshTokenExpiration)).toDate()
        };
        return tokenDb.Create(ctx, new_values, re_read = true);
      }).then(function(new_rec) {
        _log.debug({
          new_rec: new_rec
        });
        return new Error('Test should not have gotten here');
      })["catch"](function(err) {
        return err.code.should.equal('ER_DUP_ENTRY');
      });
    });
    it('should return a full record for a specific token if not expired', function() {
      var ctx, ident_token, new_values;
      ctx = {
        conn: null,
        log: _log
      };
      new_values = {};
      ident_token = false;
      return (core.Acquire()).then(function(c) {
        ctx.conn = c;
        return tokenDb.GetNonExpiredToken(ctx, valid_token);
      }).then(function(db_rows) {
        return db_rows.should.deep.equal([
          {
            id: Util.test_ident_id,
            role: null,
            tenant: null
          }
        ]);
      });
    });
    it('should return nothing for a specific token if expired', function() {
      var ctx, ident_token, new_values;
      ctx = {
        conn: null,
        log: _log
      };
      new_values = {};
      ident_token = false;
      return (core.Acquire()).then(function(c) {
        ctx.conn = c;
        return tokenDb.GetNonExpiredToken(ctx, exp_token);
      }).then(function(db_rows) {
        return db_rows.length.should.equal(0);
      });
    });
    it('should insert a new token and remove the old one if given on update', function() {
      var ctx, ident_token, nv;
      ctx = {
        conn: null,
        log: _log
      };
      nv = {};
      ident_token = false;
      return (core.Acquire()).then(function(c) {
        ctx.conn = c;
        nv = {
          ident_id: Util.test_ident_id,
          client: 'TEST_FRAMEWORK',
          token: rename('ANOTHER_TOKEN'),
          exp: (moment().add(config.auth.refreshTokenExpiration, 'seconds')).toDate()
        };
        return tokenDb.UpdateActiveToken(ctx, nv, valid_token);
      }).then(function(new_rec) {
        new_rec.token.should.equal(nv.token);
        new_rec.ident_id.should.equal(Util.test_ident_id);
        new_rec.client.should.equal(nv.client);
        new_rec.exp.toString().should.equal(nv.exp.toString());
        return Util.db.GetByKey(ctx, 'ident_tokens', 'token', [nv.token]);
      }).then(function(db_rows) {
        db_rows.length.should.equal(1);
        db_rows[0].token.should.equal(nv.token);
        db_rows[0].ident_id.should.equal(Util.test_ident_id);
        db_rows[0].client.should.equal(nv.client);
        db_rows[0].exp.toString().should.equal(nv.exp.toString());
        return Util.db.GetByKey(ctx, 'ident_tokens', 'token', [valid_token]);
      }).then(function(db_rows) {
        db_rows.length.should.equal(0);
        return core.release(ctx.conn);
      })["catch"](function(err) {
        _log.error({
          err: err
        });
        if (ctx.conn !== null) {
          return core.release(ctx.conn);
        }
      });
    });
    return it('should insert and return a new token if not given an old one', function() {
      var ctx, ident_token, nv;
      ctx = {
        conn: null,
        log: _log
      };
      nv = {};
      ident_token = false;
      return (core.Acquire()).then(function(c) {
        ctx.conn = c;
        nv = {
          ident_id: Util.test_ident_id,
          client: 'TEST_FRAMEWORK',
          token: rename('ANOTHER_TOKEN'),
          exp: (moment().add(config.auth.refreshTokenExpiration, 'seconds')).toDate()
        };
        return tokenDb.UpdateActiveToken(ctx, nv);
      }).then(function(new_rec) {
        new_rec.token.should.equal(nv.token);
        new_rec.ident_id.should.equal(Util.test_ident_id);
        new_rec.client.should.equal(nv.client);
        new_rec.exp.toString().should.equal(nv.exp.toString());
        return Util.db.GetByKey(ctx, 'ident_tokens', 'token', [nv.token]);
      }).then(function(db_rows) {
        db_rows.length.should.equal(1);
        db_rows[0].token.should.equal(nv.token);
        db_rows[0].ident_id.should.equal(Util.test_ident_id);
        db_rows[0].client.should.equal(nv.client);
        return db_rows[0].exp.toString().should.equal(nv.exp.toString());
      })["catch"](function(err) {
        _log.error({
          err: err
        });
        if (ctx.conn !== null) {
          core.release(ctx.conn);
        }
        throw err;
      });
    });
  });

}).call(this);
