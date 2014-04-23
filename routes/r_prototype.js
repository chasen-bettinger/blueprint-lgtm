// Generated by CoffeeScript 1.6.3
(function() {
  var E, Prototype, PrototypeModule, Q, _, _log,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Q = require('q');

  E = require('../lib/error');

  _ = require('lodash');

  _log = false;

  Prototype = (function() {
    function Prototype(kit) {
      this.add = __bind(this.add, this);
      var mod, _i, _len, _ref;
      kit.services.logger.log.info('Initializing Prototype Routes...');
      _log = kit.services.logger.log;
      this.protos = kit.services.config.prototype_modules;
      this.wrapper = kit.services.wrapper;
      this.wrapper.add_wrap('prototype', this.add);
      _ref = this.protos;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        mod = _ref[_i];
        if (mod.enable) {
          kit.add_route_service(mod.name, new PrototypeModule(mod));
        }
      }
    }

    Prototype.prototype.add = function(mod_prototype) {
      var mod, _i, _len, _ref, _results;
      _ref = this.protos;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        mod = _ref[_i];
        if (mod.enable) {
          _results.push(this.wrapper.add(mod.name));
        }
      }
      return _results;
    };

    return Prototype;

  })();

  PrototypeModule = (function() {
    function PrototypeModule(mod) {
      var dataset, nm, _ref;
      this.mod = mod;
      this._delete = __bind(this._delete, this);
      this._update = __bind(this._update, this);
      this._create = __bind(this._create, this);
      this._get = __bind(this._get, this);
      this.resource = {};
      this.endpoints = {};
      _ref = this.mod.datasets;
      for (nm in _ref) {
        dataset = _ref[nm];
        this.resource[nm] = {
          table: [],
          idx: {},
          counter: 0
        };
        this.endpoints["get" + nm] = {
          verb: 'get',
          route: "/Prototype/" + this.mod.name + "/" + nm,
          use: true,
          wrap: 'read_wrap',
          version: {
            any: this.proto_wrap(this._get, nm)
          },
          auth_required: this.mod.auth_req
        };
        this.endpoints["get_by_id" + nm] = {
          verb: 'get',
          route: "/Prototype/" + this.mod.name + "/" + nm + "/:r0id",
          use: true,
          wrap: 'read_wrap',
          version: {
            any: this.proto_wrap(this._get, nm)
          },
          auth_required: this.mod.auth_req
        };
        this.endpoints["create" + nm] = {
          verb: 'post',
          route: "/Prototype/" + this.mod.name + "/" + nm,
          use: true,
          wrap: 'update_wrap',
          version: {
            any: this.proto_wrap(this._create, nm)
          },
          sql_conn: false,
          auth_required: this.mod.auth_req
        };
        this.endpoints["update" + nm] = {
          verb: 'put',
          route: "/Prototype/" + this.mod.name + "/" + nm + "/:r0id/update",
          use: true,
          wrap: 'update_wrap',
          version: {
            any: this.proto_wrap(this._update, nm)
          },
          auth_required: this.mod.auth_req
        };
        this.endpoints["delete" + nm] = {
          verb: 'del',
          route: "/Prototype/" + this.mod.name + "/" + nm + "/:r0id/delete",
          use: true,
          wrap: 'update_wrap',
          version: {
            any: this.proto_wrap(this._delete, nm)
          },
          auth_required: this.mod.auth_req
        };
      }
    }

    PrototypeModule.prototype.proto_wrap = function(func, resource) {
      return function(conn, p, pre_loaded, _log) {
        return func(conn, p, pre_loaded, _log, resource);
      };
    };

    PrototypeModule.prototype._get = function(conn, p, pre_loaded, _log, resource) {
      var f, r, r0id, result, use_doc,
        _this = this;
      use_doc = {};
      if (conn === 'use') {
        return use_doc;
      }
      f = "Prototype:_get:" + this.mod.name + ":" + resource + ":";
      r = this.resource[resource];
      r0id = Number(p.r0id);
      result = {};
      if (p.r0id) {
        if (!(r0id in r.idx)) {
          throw new E.NotFoundError("PROTO:GET:" + this.mod.name + ":" + resource + ":r0id");
        }
      }
      return Q.resolve().then(function() {
        result[resource] = p.r0id ? [r.idx[r0id]] : r.table;
        result.success = true;
        return {
          send: result
        };
      });
    };

    PrototypeModule.prototype._create = function(conn, p, pre_loaded, _log, resource) {
      var col, f, r, rec, result, schema, use_doc,
        _this = this;
      use_doc = this.mod.datasets[resource];
      if (conn === 'use') {
        return use_doc;
      }
      f = "Prototype:_create:" + this.mod.name + ":" + resource + ":";
      r = this.resource[resource];
      schema = this.mod.datasets[resource];
      rec = {};
      result = {};
      for (col in schema) {
        if (!(col in p)) {
          throw new E.MissingArg(col);
        }
        rec[col] = p[col];
      }
      rec.id = r.counter++;
      return Q.resolve().then(function() {
        r.table.push(rec);
        r.idx[rec.id] = rec;
        result[resource] = [rec];
        result.success = true;
        return {
          send: result
        };
      });
    };

    PrototypeModule.prototype._update = function(conn, p, pre_loaded, _log, resource) {
      var f, new_values, nm, r, result, schema, use_doc, val,
        _this = this;
      use_doc = this.mod.datasets[resource];
      if (conn === 'use') {
        return use_doc;
      }
      f = "Prototype:_update:" + this.mod.name + ":" + resource + ":";
      r = this.resource[resource];
      schema = this.mod.datasets[resource];
      new_values = {};
      result = {};
      for (nm in p) {
        val = p[nm];
        if (nm in schema) {
          new_values[nm] = val;
        }
      }
      return Q.resolve().then(function() {
        if (!(p.r0id in r.idx)) {
          throw new E.NotFoundError("PROTO:UPDATE:" + _this.mod.name + ":" + resource + ":r0id");
        }
        r.idx[p.r0id] = _.merge(r.idx[p.r0id], new_values);
        result[resource] = r.idx[p.r0id];
        result.success = true;
        return {
          send: result
        };
      });
    };

    PrototypeModule.prototype._delete = function(conn, p, pre_loaded, _log, resource) {
      var f, r, use_doc;
      use_doc = this.mod.datasets[resource];
      if (conn === 'use') {
        return use_doc;
      }
      f = "Prototype:_update:" + this.mod.name + ":" + resource + ":";
      r = this.resource[resource];
      return Q.resolve().then(function() {
        if (!(p.r0id in r.idx)) {
          throw new E.NotFoundError("PROTO:DELETE:" + this.mod.name + ":" + resource + ":r0id");
        }
        delete r.idx[p.r0id];
        return {
          send: {
            success: true
          }
        };
      });
    };

    return PrototypeModule;

  })();

  exports.Prototype = Prototype;

}).call(this);