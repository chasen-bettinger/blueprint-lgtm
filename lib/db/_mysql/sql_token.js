// Generated by CoffeeScript 1.9.2
(function() {
  var Promise, SqlToken,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Promise = require('bluebird');

  SqlToken = (function() {
    SqlToken.deps = {};

    function SqlToken(core, kit) {
      this.core = core;
      this.UpdateActiveToken = bind(this.UpdateActiveToken, this);
      this.table = 'ident_tokens';
      this.schema = {
        Create: ['token', 'ident_id', 'client', 'exp'],
        get: ['i.id', 'i.tenant', 'i.role'],
        reread: ['*']
      };
      this.core.method_factory(this, 'SqlToken');
    }

    SqlToken.prototype.GetNonExpiredToken = function(ctx, token) {
      var sql;
      sql = "SELECT " + (this.schema.get.join(',')) + " FROM " + this.table + " t\nJOIN ident i ON i.id= t.ident_id\nWHERE token = ? AND exp > CURDATE()";
      return (this.core.sqlQuery(ctx, sql, [token])).then(function(db_rows) {
        return db_rows;
      });
    };

    SqlToken.prototype.UpdateActiveToken = function(ctx, new_values, current_ident_token) {
      return Promise.resolve().bind(this).then(function() {
        var sql;
        if (!current_ident_token) {
          return false;
        }
        sql = "DELETE FROM " + this.table + " \nWHERE token = ?";
        return this.core.sqlQuery(ctx, sql, [current_ident_token]);
      }).then(function(db_result) {
        var reread;
        return this.Create(ctx, new_values, reread = true);
      }).then(function(db_rec) {
        return db_rec;
      });
    };

    return SqlToken;

  })();

  exports.SqlToken = SqlToken;

}).call(this);
