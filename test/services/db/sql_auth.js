// Generated by CoffeeScript 1.9.2

/*
Test Suite for Sql Auth
 */

(function() {
  var Kit, Logger, SqlAuth, SqlCore, Util, _log, chai, config, kit, rename;

  chai = require('chai');

  Util = require('../../lib/Util');

  Kit = require('../../../lib/kit').Kit;

  Logger = require('../../../lib/logger').Logger;

  SqlCore = require('../../../lib/db/_mysql/sql_core').SqlCore;

  SqlAuth = require('../../../lib/db/_mysql/sql_auth').SqlAuth;

  chai.should();

  config = Util.config;

  kit = new Kit;

  kit.add_service('config', config);

  kit.new_service('logger', Logger);

  _log = kit.services.logger.log;

  rename = function(name) {
    return 'bp-' + name + '' + new Date().getTime();
  };


  /*
  class SqlAuth
  	constructor: (@core, kit)-> (logger.log)
  	Create: (ctx, new_values, reread)->
  	GetById: (ctx, id)=> @GetByKey ctx, 'id', [id]
  	GetAuthCreds: (ctx, cred_name)->
  	GetByCredName: (ctx, cred_name)->
  	UpdateById: (ctx, id, new_values, re_read)->
   */

  describe('Sql Auth Module', function() {
    var auth, conn, core, ident;
    core = new SqlCore(kit, config.db.mysql.pool);
    auth = new SqlAuth(core, kit);
    ident = false;
    conn = false;
    before(function() {
      var vals;
      vals = {
        eml: rename('test@test.com'),
        pwd: Util.encryptedPassword,
        role: 'r',
        tenant: 't'
      };
      return (Util.db.InsertOne('ident', vals)).then(function(ident_rec) {
        return ident = ident_rec;
      });
    });
    after(function() {});
    it('should insert a username and password', function() {
      var ctx, new_values;
      ctx = {
        conn: null,
        log: _log
      };
      new_values = {};
      return (core.Acquire()).then(function(c) {
        var re_read;
        ctx.conn = c;
        new_values = {
          eml: rename('test@test.com'),
          pwd: Util.encryptedPassword
        };
        return auth.Create(ctx, new_values, re_read = true);
      }).then(function(new_rec) {
        new_rec.eml.should.equal(new_values.eml);
        new_rec.pwd.should.equal(new_values.pwd);
        return Util.db.GetOne('ident', new_rec.id);
      }).then(function(rec) {
        rec.eml.should.equal(new_values.eml);
        rec.pwd.should.equal(new_values.pwd);
        return core.release(ctx.conn);
      })["catch"](function(err) {
        _log.debug({
          err: err
        });
        if (ctx.conn !== null) {
          core.release(ctx.conn);
        }
        throw err;
      });
    });
    it('should get ident record (id,eml) by id', function() {
      var ctx;
      ctx = {
        conn: null,
        log: _log
      };
      return (core.Acquire()).then(function(c) {
        ctx.conn = c;
        return auth.GetById(ctx, ident.id);
      }).then(function(db_rows) {
        return db_rows[0].should.deep.equal({
          id: ident.id,
          eml: ident.eml,
          role: 'r',
          tenant: 't'
        });
      })["catch"](function(err) {
        _log.debug({
          err: err
        });
        if (ctx.conn !== null) {
          core.release(ctx.conn);
        }
        throw err;
      });
    });
    it('should get an ident record for a username', function() {
      var ctx;
      ctx = {
        conn: null,
        log: _log
      };
      return (core.Acquire()).then(function(c) {
        ctx.conn = c;
        return auth.GetByCredName(ctx, ident.eml);
      }).then(function(db_rows) {
        return db_rows[0].should.deep.equal(ident);
      })["catch"](function(err) {
        _log.debug({
          err: err
        });
        if (ctx.conn !== null) {
          core.release(ctx.conn);
        }
        throw err;
      });
    });
    it('should get an id and password for a username', function() {
      var ctx;
      ctx = {
        conn: null,
        log: _log
      };
      return (core.Acquire()).then(function(c) {
        ctx.conn = c;
        return auth.GetAuthCreds(ctx, ident.eml);
      }).then(function(db_rows) {
        return db_rows[0].should.deep.equal({
          id: ident.id,
          pwd: ident.pwd,
          role: 'r',
          tenant: 't'
        });
      })["catch"](function(err) {
        _log.debug({
          err: err
        });
        if (ctx.conn !== null) {
          core.release(ctx.conn);
        }
        throw err;
      });
    });
    return it('should update a username and password for an id', function() {
      var ctx, new_values;
      ctx = {
        conn: null,
        log: _log
      };
      new_values = {};
      return (core.Acquire()).then(function(c) {
        var re_read;
        ctx.conn = c;
        new_values = {
          eml: rename('test2@test.com'),
          pwd: 'password'
        };
        return auth.UpdateById(ctx, ident.id, new_values, re_read = true);
      }).then(function(updated_rec) {
        _log.debug('got updated rec:', updated_rec);
        updated_rec.eml.should.equal(new_values.eml);
        updated_rec.pwd.should.equal(new_values.pwd);
        return Util.db.GetOne('ident', ident.id);
      }).then(function(rec) {
        rec.eml.should.equal(new_values.eml);
        rec.pwd.should.equal(new_values.pwd);
        return core.release(ctx.conn);
      })["catch"](function(err) {
        _log.debug({
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
