// Generated by CoffeeScript 1.9.2
(function() {
  var Lamd, MongoClient, _,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  MongoClient = require('mongodb').MongoClient;

  _ = require('lodash');

  Lamd = (function() {
    Lamd.deps = {
      services: ['logger'],
      config: 'lamd'
    };

    function Lamd(kit) {
      this.write = bind(this.write, this);
      this.server_init_promise = bind(this.server_init_promise, this);
      var f;
      f = 'Lamd:constructor';
      this.config = kit.services.config.lamd;
      this.log = kit.services.logger.log;
      this.db = false;
    }

    Lamd.prototype.server_init_promise = function(kit, promise_chain) {
      var f, server;
      f = 'Lamd:server_init:';
      server = kit.services.server.server;
      promise_chain = promise_chain.then((function(_this) {
        return function() {
          return MongoClient.connect(_this.config.connect_url);
        };
      })(this));
      promise_chain = promise_chain.then((function(_this) {
        return function(db) {
          _this.log.debug(f, _.pick(db, ['databaseName', 'options']));
          if (db == null) {
            throw new Error(f + 'MongoDB connection is empty');
          }
          _this.db = db;
          return _this.collection_debug = db.collection('debug');
        };
      })(this));
      return promise_chain;
    };

    Lamd.prototype.write = function(data) {
      var err, f;
      f = 'Lamd:write:';
      try {
        return this._write(data);
      } catch (_error) {
        err = _error;
        return this.log.warn(f + 'err', err);
      }
    };

    Lamd.prototype._write = function(data) {
      var f;
      f = 'Lamd:_write:';
      return this.collection_debug.insertOne(data, {
        forceServerObjectId: true
      }, (function(_this) {
        return function(err, result) {
          if (err != null) {
            return _this.log.debug(f, {
              err: err,
              result: result
            });
          }
        };
      })(this));
    };

    return Lamd;

  })();

  exports.Lamd = Lamd;

}).call(this);
