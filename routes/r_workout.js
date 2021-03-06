// Generated by CoffeeScript 1.9.2
(function() {
  var Promise, Workout,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Promise = require('blueprint');

  Workout = (function() {
    function Workout(kit) {
      this._create = bind(this._create, this);
      this._get = bind(this._get, this);
      kit.services.logger.log.info('Initializing Workout Routes...');
      this.E = kit.services.error;
      this.odb = kit.services.db.mongo;
      this.endpoints = {
        get: {
          verb: 'get',
          route: '/Workout',
          use: true,
          wrap: 'default_wrap',
          version: {
            any: this._get
          },
          auth_required: true
        },
        create: {
          verb: 'post',
          route: '/Workout',
          use: true,
          wrap: 'default_wrap',
          version: {
            any: this._create
          },
          auth_required: true
        }
      };
    }

    Workout.prototype._get = function(ctx, pre_loaded) {
      var f, p, use_docs;
      use_docs = {};
      if (ctx === 'use') {
        return use_docs;
      }
      f = 'Workout:_get:';
      p = ctx.p;
      ctx.log.debug(f, p);
      return Promise.resolve().bind(this).then(function() {
        return this.odb.core.find(this.odb.Workout, {});
      }).then(function(docs) {
        return {
          send: {
            workouts: docs
          }
        };
      });
    };

    Workout.prototype._create = function(ctx, pre_loaded) {
      var f, newWorkout, opts, p, use_docs;
      use_docs = {
        description: 'rS',
        workout_name: 'rS',
        type: 'rE:good,bad'
      };
      if (ctx === 'use') {
        return use_docs;
      }
      f = 'Workout:_create:';
      p = ctx.p;
      newWorkout = false;
      opts = {
        name: p.workout_name,
        description: p.description,
        type: p.type
      };
      if (!p.description) {
        throw new this.E.MissingArg('description');
      }
      if (!p.workout_name) {
        throw new this.E.MissingArg('workout_name');
      }
      if (!p.type) {
        throw new this.E.MissingArg('type');
      }
      return Promise.resolve().bind(this).then(function() {
        return this.odb.Workout.FindByName(p.workout_name);
      }).then(function(docs) {
        ctx.log.debug('got docs:', docs);
        if (docs.length > 0) {
          throw new this.E.AccessDenied('Name already exists', {
            name: p.workout_name
          });
        }
        newWorkout = new this.odb.Workout(opts);
        ctx.log.debug('typeName:', newWorkout.typeName);
        return newWorkout.FindSimilarTypes();
      }).then(function(docs) {
        ctx.log.debug('got similar Types:', docs);
        return this.odb.core.create(this.odb.Workout, opts);
      }).then(function() {
        return {
          send: {
            success: true,
            message: 'Workout created with name:' + newWorkout.name
          }
        };
      });
    };

    return Workout;

  })();

  exports.Workout = Workout;

}).call(this);
