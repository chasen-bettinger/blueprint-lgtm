// Generated by CoffeeScript 1.9.2
(function() {
  var Promise, Registration, moment,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Promise = require('bluebird');

  moment = require('moment');

  Registration = (function() {
    Registration.deps = {
      services: ['error', 'config', 'ses', 'auth', 'tripMgr', 'template'],
      mysql: ['auth', 'user'],
      config: 'ses.options,api.ident_id'
    };

    function Registration(kit) {
      this._register_signup = bind(this._register_signup, this);
      this._read_signup = bind(this._read_signup, this);
      this._signup = bind(this._signup, this);
      this.E = kit.services.E;
      this.config = kit.services.config;
      this.sdb = kit.services.db.mysql;
      this.ses = kit.services.ses;
      this.auth = kit.services.auth;
      this.tripMgr = kit.services.tripMgr;
      this.template = kit.services.template;
      this.endpoints = {
        signup: {
          verb: 'post',
          route: '/Signup',
          sql_conn: true,
          sql_tx: true,
          auth_required: false,
          use: true,
          wrap: 'default_wrap',
          version: {
            any: this._signup
          }
        },
        read_signup: {
          verb: 'get',
          route: '/Signup/:token',
          use: true,
          wrap: 'default_wrap',
          version: {
            any: this._read_signup
          },
          sql_conn: true,
          auth_required: false
        }
      };
    }

    Registration.prototype.make_tbl = function(recipient, token, options) {
      return {
        Trip: [
          {
            token: token
          }
        ],
        Recipient: [recipient],
        Opt: [options]
      };
    };

    Registration.prototype._signup = function(ctx, pre_loaded) {
      var f, p, recipient, success, use_doc;
      use_doc = {
        params: {
          fnm: 'r:S',
          lnm: 'r:S',
          eml: 'r:S',
          role: 'r:S [vendor | executive]'
        },
        response: {
          success: 'bool'
        }
      };
      if (ctx === 'use') {
        return use_doc;
      }
      p = ctx.p;
      recipient = false;
      success = false;
      f = 'Registration:_signup:';
      if (!p.eml) {
        throw new this.E.MissingArg('eml');
      }
      if (!p.fnm) {
        throw new this.E.MissingArg('fnm');
      }
      if (!p.lnm) {
        throw new this.E.MissingArg('lnm');
      }
      if (!p.role) {
        throw new this.E.MissingArg('role');
      }
      return Promise.resolve().bind(this).then(function() {
        return this.sdb.auth.GetByCredName(ctx, p.eml);
      }).then(function(db_rows) {
        var expireDate, expires;
        ctx.log.debug('got ident with eml:', db_rows);
        if (db_rows.length !== 0) {
          throw new this.E.AccessDenied('REGISTER:SIGNUP:EMAIL_EXISTS');
        }
        expires = 3;
        expireDate = moment().add(expires, 'days').format();
        return this.tripMgr.planTrip(ctx, this.config.api.ident_id, {
          eml: p.eml,
          fnm: p.fnm,
          lnm: p.lnm,
          role: p.role
        }, expireDate, 'signup');
      }).then(function(new_trip) {
        var trip;
        ctx.log.debug(f, 'got signup round trip:', new_trip);
        trip = new_trip;
        recipient = {
          eml: p.eml,
          fnm: p.fnm,
          lnm: p.lnm
        };
        return this.ses.send('verify_signup', this.make_tbl(recipient, trip.token, this.config.ses.options));
      }).then(function() {
        success = true;
        return {
          send: {
            success: success,
            recipient: recipient
          }
        };
      });
    };

    Registration.prototype._read_signup = function(ctx, pre_loaded) {
      var f, p, success, trip, use_doc;
      use_doc = {
        params: {},
        response: {
          success: 'bool',
          signup: 'JSON'
        }
      };
      if (ctx === 'use') {
        return use_doc;
      }
      p = ctx.p;
      trip = false;
      success = false;
      f = 'Registration:_read_signup:';
      return Promise.resolve().bind(this).then(function() {
        return this.tripMgr.getTripFromToken(ctx, p.token);
      }).then(function(trip_info) {
        var bad_token;
        ctx.log.debug(f, 'got round trip:', trip_info);
        trip = trip_info;
        bad_token = trip_info.status === 'unknown' || trip_info.status !== 'valid';
        if (bad_token) {
          throw new this.E.AccessDenied('REGISTER:READ_SIGNUP:BAD_TOKEN');
        }
        trip.json = JSON.parse(trip.json);
        return this.sdb.auth.GetByCredName(ctx, trip.json.eml);
      }).then(function(db_rows) {
        ctx.log.debug('got ident with eml:', db_rows);
        if (db_rows.length !== 0) {
          throw new this.E.AccessDenied('REGISTER:READ_SIGNUP:EMAIL_EXISTS');
        }
        success = true;
        return {
          send: {
            success: success,
            signup: trip.json
          }
        };
      });
    };

    Registration.prototype._register_signup = function(ctx, pre_loaded) {
      var change_trip, eml, eml_change, f, new_ident_id, new_pwd, p, success, trip, use_doc;
      use_doc = {
        params: {
          fnm: 'r:S',
          lnm: 'r:S',
          eml: 'r:S',
          pwd: 'r:S'
        },
        response: {
          success: 'bool',
          eml_change: 'bool'
        }
      };
      if (ctx === 'use') {
        return use_doc;
      }
      f = 'Registration:_register_signup:';
      p = ctx.p;
      trip = false;
      change_trip = false;
      eml = p.eml;
      eml_change = false;
      new_ident_id = false;
      new_pwd = '';
      success = false;
      if (!p.eml) {
        throw new this.E.MissingArg('eml');
      }
      if (!p.pwd) {
        throw new this.E.MissingArg('pwd');
      }
      if (!p.fnm) {
        throw new this.E.MissingArg('fnm');
      }
      if (!p.lnm) {
        throw new this.E.MissingArg('lnm');
      }
      return Promise.resolve().bind(this).then(function() {
        return this.tripMgr.getTripFromToken(ctx, p.token);
      }).then(function(trip_info) {
        var bad_token;
        ctx.log.debug(f, 'got round trip:', trip_info);
        trip = trip_info;
        bad_token = trip_info.status === 'unknown' || trip_info.status !== 'valid';
        if (bad_token) {
          throw new this.E.AccessDenied('REGISTER:REGISTER_SIGNUP:BAD_TOKEN');
        }
        trip.json = JSON.parse(trip.json);
        eml_change = eml !== trip.json.eml;
        return this.sdb.auth.GetByCredName(ctx, eml);
      }).then(function(db_rows) {
        ctx.log.debug(f, 'got ident with eml:', db_rows);
        if (db_rows.length !== 0) {
          throw new this.E.AccessDenied('REGISTER:REGISTER_SIGNUP:EMAIL_EXISTS');
        }
        success = true;
        return this.auth.EncryptPassword(p.pwd);
      }).then(function(pwd_hash) {
        var new_ident;
        new_pwd = pwd_hash;
        new_ident = {
          eml: trip.json.eml,
          pwd: new_pwd
        };
        return this.sdb.auth.Create(ctx, new_ident);
      }).then(function(db_result) {
        var new_profile;
        if (db_result.affectedRows !== 1) {
          throw new this.E.DbError('REGISTER:REGISTER_SIGNUP:CREATE_IDENT');
        }
        new_ident_id = db_result.insertId;
        new_profile = {
          ident_id: new_ident_id,
          fnm: p.fnm,
          lnm: p.lnm
        };
        return this.sdb.user.Create(ctx, new_profile);
      }).then(function(db_result) {
        if (db_result.affectedRows !== 1) {
          throw new this.E.DbError('REGISTER:REGISTER_SIGNUP:CREATE_PROFILE');
        }
        return this.tripMgr.returnFromTrip(ctx, trip.id, new_ident_id);
      }).then(function() {
        var recipient;
        if (eml_change) {
          return false;
        }
        recipient = {
          email: p.eml,
          fnm: p.fnm,
          lnm: p.lnm
        };
        return this.ses.send('signup_complete', this.make_tbl(recipient));
      }).then(function() {
        if (!eml_change) {
          return false;
        }
        return this.tripMgr.planTrip(ctx, new_ident_id, {
          eml: eml
        }, null, 'update_email');
      }).then(function(new_trip) {
        var recipient;
        ctx.log.debug(f, 'got round trip:', new_trip);
        if (new_trip !== false) {
          change_trip = new_trip;
        }
        if (!eml_change) {
          return false;
        }
        recipient = {
          email: eml
        };
        return this.ses.send('verify_email_change', this.make_tbl(recipient, change_trip.token));
      }).then(function() {
        success = true;
        return {
          send: {
            success: success,
            eml_change: eml_change
          }
        };
      });
    };

    return Registration;

  })();

  exports.Registration = Registration;

}).call(this);
