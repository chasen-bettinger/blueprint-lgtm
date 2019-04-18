// Generated by CoffeeScript 1.9.2
(function() {
  var Client, CommonCore, Pool, PostgreSqlCore, Promise, ref,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Promise = require('bluebird');

  ref = require('pg'), Pool = ref.Pool, Client = ref.Client;

  CommonCore = require('../CommonCore').CommonCore;

  PostgreSqlCore = (function(superClass) {
    extend(PostgreSqlCore, superClass);

    PostgreSqlCore.deps = {
      services: ['error', 'logger']
    };

    function PostgreSqlCore(kit, pool_opts) {
      var _log2;
      this.f = 'PostgreSqlCore';
      this.E = kit.services.error;
      _log2 = pool_opts.level2_debug ? kit.services.logger.log : {
        debug: function() {}
      };
      this.is_db_log_on = pool_opts.level2_debug;
      this.pool = new Pool(pool_opts);
      this.acquire = function(callback) {
        return this.pool.connect(callback);
      };
      this.Acquire = Promise.promisify(this.acquire, {
        context: this
      });
      this.release = function(conn) {
        _log2.debug('DB:PostgreSqlCore:release:', 'releasing conn');
        return conn.release();
      };
      this.destroy = function(conn) {
        _log2.debug('DB:PostgreSqlCore:destroy:', 'destroying conn');
        return conn.end();
      };
      this.sqlQuery = (function(_this) {
        return function(ctx, sql, args) {
          var f, query, statement;
          if (args == null) {
            args = [];
          }
          f = _this.f + ":sqlQuery::";
          if (_this.is_db_log_on) {
            ctx.log.debug('DB:PostgreSqlCore:sqlQuery:', sql);
          }
          if (args && _this.is_db_log_on) {
            ctx.log.debug('DB:PostgreSqlCore:args:', args);
          }
          if (args && !Array.isArray(args)) {
            throw new _this.E.InvalidArg(f + "args must be an array!");
          }
          if (ctx.conn === null) {
            throw new _this.E.DbError('DB:PostgreSQL:BAD_CONN');
          }
          statement = sql;
          query = Promise.promisify(ctx.conn.query, {
            context: ctx.conn
          });
          return Promise.resolve().bind(_this).then(function() {
            var i, index, len, value;
            for (index = i = 0, len = args.length; i < len; index = ++i) {
              value = args[index];
              if (Array.isArray(value)) {
                statement.replace('IN (?)', '= ANY($' + (index + 1) + ')');
              } else {
                statement = statement.replace('?', '$' + (index + 1));
              }
            }
            return query(statement, args);
          }).then(function(just_rows) {
            if (this.is_db_log_on) {
              ctx.log.debug('DB:PostgreSqlCore:result:', just_rows);
            }
            return just_rows;
          });
        };
      })(this);
    }

    return PostgreSqlCore;

  })(CommonCore);

  exports.PostgreSqlCore = PostgreSqlCore;

}).call(this);