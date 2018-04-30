// Generated by CoffeeScript 1.9.2
(function() {
  var Db, Promise, _, _log, chai, clean_db_jobs, clean_poll_result, config, db, is_it, it_is, moment, server;

  Promise = require('bluebird');

  moment = require('moment-timezone');

  chai = require('chai');

  Db = require('../lib/db');

  server = require('../../../blueprint');

  config = require('../config');

  it_is = is_it = require('is_js');

  _ = require('lodash');

  _log = console.log;

  chai.should();

  db = Db.Instance(config.mysql);

  clean_db_jobs = function(db_rows) {
    var i, job, len, results;
    results = [];
    for (i = 0, len = db_rows.length; i < len; i++) {
      job = db_rows[i];
      delete job.cr;
      delete job.mo;
      delete job.id;
      if (job.run_at) {
        job.run_at = moment(job.run_at).format();
      }
      if (job.fail_at) {
        results.push(job.fail_at = moment(job.fail_at).format());
      } else {
        results.push(void 0);
      }
    }
    return results;
  };

  clean_poll_result = function(result, debug) {
    var ary, f, i, len, line, obj_key, results;
    if (debug == null) {
      debug = false;
    }
    f = 'TEST::clean_poll_request:';
    if (debug) {
      _log(f, {
        result: result
      });
    }
    if (!it_is.array(result)) {
      return;
    }
    results = [];
    for (i = 0, len = result.length; i < len; i++) {
      line = result[i];
      if (debug) {
        _log(f, {
          line: line
        });
      }
      if (it_is.array(ary = line.next_jobs || line.process_result || line.MarkJobPending_result)) {
        if (debug) {
          _log(f + 'DB', {
            ary: ary
          });
        }
        results.push(clean_db_jobs(ary));
      } else {
        results.push((function() {
          var j, len1, ref, ref1, results1;
          ref = ['process_result'];
          results1 = [];
          for (j = 0, len1 = ref.length; j < len1; j++) {
            obj_key = ref[j];
            if (debug) {
              _log(f + 'OBJ?', {
                o: line[obj_key],
                t: typeof ((ref1 = line[obj_key]) != null ? ref1.affectedRows : void 0)
              });
            }
            if ((it_is.object(line[obj_key])) && (it_is.number(line[obj_key].affectedRows))) {
              line[obj_key] = _.pick(line[obj_key], ['affectedRows']);
              if (debug) {
                results1.push(_log(f + 'OBJ', {
                  o: line[obj_key]
                }));
              } else {
                results1.push(void 0);
              }
            } else {
              results1.push(void 0);
            }
          }
          return results1;
        })());
      }
    }
    return results;
  };

  describe('RunQueue: ', function() {
    var base_group_cnt, base_job_result, cleanup, ctx, dash_id_1, fail_default, health_check_json, jobs_to_expect_at_the_end, rq_max, runqueue_service, unique, unique_json, userA;
    jobs_to_expect_at_the_end = [];
    unique = 'TESTABILITY_101';
    unique_json = JSON.stringify({
      unique: unique
    });
    health_check_json = JSON.stringify({
      health_check: 101
    });
    dash_id_1 = 99099;
    userA = config.auth_runqueue;
    rq_max = 1000 * 1000;
    base_group_cnt = {
      SampleTest: rq_max,
      SES: rq_max,
      GenericService: 2
    };
    fail_default = [5, 'm'];
    base_job_result = {
      my_test_topic: {
        di: 0,
        unique_key: null,
        fail_at: null,
        group_ref: 'SET-ME',
        in_process: 0,
        json: unique_json,
        last_reason: null,
        priority: 350,
        retries: 0
      },
      topic_success: {
        di: 0,
        unique_key: 'topic_success',
        fail_at: null,
        group_ref: 'SET-ME',
        in_process: 0,
        json: unique_json,
        last_reason: null,
        priority: 300,
        retries: 0
      },
      topic_fail: {
        di: 0,
        unique_key: 'topic_fail',
        fail_at: null,
        group_ref: 'Mock',
        in_process: 0,
        json: unique_json,
        last_reason: null,
        priority: 300,
        retries: 0
      }
    };
    runqueue_service = false;
    ctx = {};
    cleanup = function() {
      var expected_in_db;
      _log('Cleaning Up...');
      expected_in_db = {};
      return Promise.resolve().then(function() {
        return db.SqlQuery('DELETE FROM runqueue WHERE json LIKE ? OR json = ?', ['%' + unique + '%', health_check_json]);
      });
    };
    describe('_Poll/init: ', function() {
      var key;
      key = false;
      before(function() {
        var f;
        f = 'before';
        return cleanup().then(function(dummy) {
          return _log(f, {
            config_auth: userA
          });
        }).then(function(rec) {
          var config_overrides, kit_overrides;
          config_overrides = {
            service_modules: {
              GenericService: {
                "class": 'GenericService',
                file: './test/lib/generic_runqueue_service'
              }
            }
          };
          kit_overrides = {
            services: {
              config: {
                runqueue: {
                  topics: {
                    topic_success: {
                      service: 'GenericService.Success',
                      type: 'per-user',
                      priority: 300,
                      run_at: [0, 's'],
                      group_ref: 'GenericService',
                      unique_key: 'topic_success'
                    },
                    topic_fail: {
                      service: 'GenericService.Fail',
                      type: 'per-user',
                      priority: 300,
                      run_at: [0, 's'],
                      group_ref: 'GenericService',
                      unique_key: 'topic_fail',
                      back_off: 'year'
                    }
                  },
                  external_groups: {
                    GenericService: {
                      connections: 2
                    }
                  }
                }
              }
            }
          };
          return server.start(false, ['db', 'RunQueue', 'GenericService'], [], true, ['runqueue'], false, config_overrides, kit_overrides);
        }).then(function(kit) {
          ctx.log = kit.services.logger.log;
          return runqueue_service = kit.services.RunQueue;
        }).then(function() {
          return ctx.conn = db.conn;
        });
      });
      after(function() {
        return _log('### TEST COMPLETE ###');
      });
      return it('_Poll with no jobs', function() {
        return Promise.resolve().then(function() {
          return runqueue_service._Poll();
        }).then(function(result) {
          return result.should.deep.equal([
            {
              step: "acquire"
            }, {
              pre_group_cnt: base_group_cnt
            }, {
              post_group_cnt: base_group_cnt
            }, {
              next_jobs: []
            }
          ]);
        });
      });
    });
    describe('AddJob sad paths: ', function() {
      it('Needs a topic', function() {
        var payload;
        payload = {
          Xtopic: 'Xalert_tropo',
          Xjson: unique_json
        };
        return Promise.resolve().then(function() {
          return runqueue_service.AddJob(ctx, payload);
        }).then(function(result) {
          return result.should.deep.equal({
            SUPPOSED: "TO BREAK"
          });
        })["catch"](function(result) {
          _log({
            result: result
          });
          return result.body.should.deep.equal({
            error: 'MissingParam',
            message: 'topic'
          });
        });
      });
      it('Needs a json', function() {
        var payload;
        payload = {
          topic: 'Xalert_tropo',
          Xjson: unique_json
        };
        return Promise.resolve().then(function() {
          return runqueue_service.AddJob(ctx, payload);
        }).then(function(result) {
          return result.should.deep.equal({
            SUPPOSED: "TO BREAK"
          });
        })["catch"](function(result) {
          _log({
            result: result
          });
          return result.body.should.deep.equal({
            error: 'MissingParam',
            message: 'json'
          });
        });
      });
      it('Needs a valid topic', function() {
        var payload;
        payload = {
          topic: 'Xalert_tropo',
          json: unique_json
        };
        return Promise.resolve().then(function() {
          return runqueue_service.AddJob(ctx, payload);
        }).then(function(result) {
          return result.should.deep.equal({
            SUPPOSED: "TO BREAK"
          });
        })["catch"](function(result) {
          _log({
            result: result
          });
          return result.body.should.deep.equal({
            error: 'InvalidParam',
            message: "topic (" + payload.topic + ")"
          });
        });
      });
      it('Add topic_fails', function() {
        var payload;
        payload = {
          topic: 'topic_fail',
          json: unique_json
        };
        return Promise.resolve().then(function() {
          return runqueue_service.AddJob(ctx, payload);
        }).then(function(result) {
          var group_ref, job, run_at;
          group_ref = 'GenericService';
          run_at = moment().add(0, 's').format();
          job = _.merge(base_job_result['topic_fail'], payload, {
            run_at: run_at,
            group_ref: group_ref
          });
          clean_db_jobs(result);
          return result.should.deep.equal([job]);
        });
      });
      return it('_Poll topic_fails', function() {
        return Promise.delay(1000).then(function() {
          return runqueue_service._Poll();
        }).then(function(result) {
          var error;
          result.should.be.an('array').that.has.a.lengthOf(6);
          result[4].should.have.a.property('topic_method_error').that.is.an.instanceOf(Error);
          error = result[4].topic_method_error;
          return jobs_to_expect_at_the_end.push(_.merge({}, base_job_result['topic_fail'], {
            last_reason: error.toString(),
            retries: 1,
            run_at: moment(result[5].process_result[0].run_at).format()
          }));
        });
      });
    });
    describe('AddJob topic_success HAPPY path: ', function() {
      var group_ref, run_at, topic;
      topic = 'topic_success';
      group_ref = 'GenericService';
      run_at = false;
      it('Just topic and json', function() {
        var payload;
        payload = {
          topic: topic,
          json: unique_json
        };
        return Promise.resolve().then(function() {
          return runqueue_service.AddJob(ctx, payload);
        }).then(function(result) {
          var job;
          run_at = moment().add(0, 's').format();
          job = _.merge(base_job_result[topic], payload, {
            run_at: run_at,
            group_ref: group_ref
          });
          clean_db_jobs(result);
          return result.should.deep.equal([job]);
        });
      });
      it('Just topic and json duplicate', function() {
        var payload;
        payload = {
          topic: topic,
          json: unique_json
        };
        return Promise.resolve().then(function() {
          return runqueue_service.AddJob(ctx, payload);
        }).then(function(result) {
          throw Error("DUPLICATE JOB CREATED!!! " + topic);
        })["catch"](function(e) {
          return e.name.should.equal(runqueue_service.ERR_DUPLICATE_JOB);
        });
      });
      it('Add jobs to exceed the group_ref limit', function() {
        var payload1;
        payload1 = {
          topic: topic,
          json: unique_json,
          unique_key: 'topic_success_1'
        };
        return Promise.resolve().then(function() {
          return runqueue_service.AddJob(ctx, payload1);
        }).then(function(result) {
          var payload2;
          payload2 = {
            topic: topic,
            json: unique_json,
            unique_key: 'topic_success_2'
          };
          return runqueue_service.AddJob(ctx, payload2);
        });
      });
      it('_Poll the jobs', function() {
        var job, job1, job2;
        job = _.merge(base_job_result[topic], {
          topic: topic,
          run_at: run_at
        });
        job1 = _.merge({}, job, {
          unique_key: 'topic_success_1'
        });
        job2 = _.merge({}, job, {
          unique_key: 'topic_success_2'
        });
        return Promise.delay(1000).then(function() {
          return runqueue_service._Poll();
        }).then(function(result) {
          var job1_active, job_active;
          job_active = _.merge(_.clone(job), {
            in_process: 1,
            fail_at: moment().add(fail_default[0], fail_default[1]).format()
          });
          job1_active = _.merge(_.clone(job1), {
            in_process: 1,
            fail_at: moment().add(fail_default[0], fail_default[1]).format()
          });
          clean_poll_result(result, true);
          result.should.deep.equal([
            {
              pre_group_cnt: base_group_cnt
            }, {
              post_group_cnt: base_group_cnt
            }, {
              next_jobs: [job, job1, job2]
            }, {
              MarkJobPending_result: [job_active]
            }, {
              topic_method_result: {
                success: true
              }
            }, {
              process_result: {
                affectedRows: 1
              }
            }, {
              MarkJobPending_result: [job1_active]
            }, {
              topic_method_result: {
                success: true
              }
            }, {
              process_result: {
                affectedRows: 1
              }
            }
          ]);
          jobs_to_expect_at_the_end.push(_.merge(_.clone(job_active), {
            di: 1
          }));
          return jobs_to_expect_at_the_end.push(_.merge(_.clone(job1_active), {
            di: 1
          }));
        })["catch"](function(result) {
          _log(result);
          if (result.body) {
            result.body.should.deep.equal({});
          }
          throw result;
        });
      });
      it('_Poll for the job throttled by group_ref', function() {
        var job, job2;
        job = _.merge(base_job_result[topic], {
          topic: topic,
          run_at: run_at
        });
        job2 = _.merge({}, job, {
          unique_key: 'topic_success_2'
        });
        return Promise.delay(1000).then(function() {
          return runqueue_service._Poll();
        }).then(function(result) {
          var job2_active;
          job2_active = _.merge(_.clone(job2), {
            in_process: 1,
            fail_at: moment().add(fail_default[0], fail_default[1]).format()
          });
          clean_poll_result(result, true);
          result.should.deep.equal([
            {
              pre_group_cnt: base_group_cnt
            }, {
              post_group_cnt: base_group_cnt
            }, {
              next_jobs: [job2]
            }, {
              MarkJobPending_result: [job2_active]
            }, {
              topic_method_result: {
                success: true
              }
            }, {
              process_result: {
                affectedRows: 1
              }
            }
          ]);
          return jobs_to_expect_at_the_end.push(_.merge(_.clone(job2_active), {
            di: 1
          }));
        })["catch"](function(result) {
          _log(result);
          if (result.body) {
            result.body.should.deep.equal({});
          }
          throw result;
        });
      });
      it('_Poll the job quickly after polling it once. (Job should be processed and gone)', function() {
        var post_group_cnt;
        post_group_cnt = _.clone(base_group_cnt);
        return Promise.resolve().then(function() {
          return runqueue_service._Poll();
        }).then(function(result) {
          clean_poll_result(result);
          return result.should.deep.equal([
            {
              pre_group_cnt: base_group_cnt
            }, {
              post_group_cnt: post_group_cnt
            }, {
              next_jobs: []
            }
          ]);
        })["catch"](function(result) {
          _log(result);
          if (result.body) {
            result.body.should.deep.equal({});
          }
          throw result;
        });
      });
      return it('_Poll the job after success/remove (should be no jobs in the queue)', function() {
        var post_group_cnt;
        post_group_cnt = _.clone(base_group_cnt);
        return Promise.delay(1000).then(function() {
          return runqueue_service._Poll();
        }).then(function(result) {
          clean_poll_result(result);
          return result.should.deep.equal([
            {
              pre_group_cnt: base_group_cnt
            }, {
              post_group_cnt: post_group_cnt
            }, {
              next_jobs: []
            }
          ]);
        })["catch"](function(result) {
          _log(result);
          if (result.body) {
            result.body.should.deep.equal({});
          }
          throw result;
        });
      });
    });
    describe('AddJob my_test_topic HAPPY path: ', function() {
      var group_ref, run_at, topic;
      topic = 'my_test_topic';
      group_ref = 'SampleTest';
      run_at = false;
      it('Topic, json, and run_at', function() {
        var payload;
        payload = {
          topic: topic,
          json: unique_json,
          run_at: [1, 's']
        };
        return Promise.resolve().then(function() {
          return runqueue_service.AddJob(ctx, payload);
        }).then(function(result) {
          var job;
          run_at = moment().add(1, 's').format();
          job = _.merge(base_job_result[topic], payload, {
            run_at: run_at,
            group_ref: group_ref
          });
          clean_db_jobs(result);
          return result.should.deep.equal([job]);
        });
      });
      it('_Poll the job before it is ready to run (no jobs)', function() {
        var job;
        job = _.merge(base_job_result[topic], {
          topic: topic,
          run_at: run_at
        });
        return Promise.delay(250).then(function() {
          return runqueue_service._Poll();
        }).then(function(result) {
          clean_poll_result(result);
          return result.should.deep.equal([
            {
              pre_group_cnt: base_group_cnt
            }, {
              post_group_cnt: base_group_cnt
            }, {
              next_jobs: []
            }
          ]);
        })["catch"](function(result) {
          _log(result);
          if (result.body) {
            result.body.should.deep.equal({});
          }
          throw result;
        });
      });
      it('_Poll the job when it is ready', function() {
        var job, post_group_cnt;
        job = _.merge(base_job_result[topic], {
          topic: topic,
          run_at: run_at
        });
        post_group_cnt = _.clone(base_group_cnt);
        return Promise.delay(2000).then(function() {
          return runqueue_service._Poll();
        }).then(function(result) {
          var expected_result, job_active, job_replace, replace;
          job_active = _.merge(_.clone(job), {
            in_process: 1,
            fail_at: moment().add(fail_default[0], fail_default[1]).format()
          });
          replace = {
            run_at: [20, 's'],
            json: job.json
          };
          job_replace = _.merge(_.clone(job), {
            run_at: moment().add(20, 's').format()
          });
          clean_poll_result(result);
          expected_result = [
            {
              pre_group_cnt: base_group_cnt
            }, {
              post_group_cnt: post_group_cnt
            }, {
              next_jobs: [job]
            }, {
              MarkJobPending_result: [job_active]
            }, {
              topic_method_result: {
                success: true,
                replace: replace
              }
            }, {
              process_result: [job_replace]
            }
          ];
          result.should.deep.equal(expected_result);
          return jobs_to_expect_at_the_end.push(_.merge(_.clone(job_replace), {}));
        })["catch"](function(result) {
          _log(result);
          if (result.body) {
            result.body.should.deep.equal({});
          }
          throw result;
        });
      });
      it('_Poll the job quickly after polling it once. (expect to see the rescheduled job, and group not active)', function() {
        var post_group_cnt;
        post_group_cnt = _.clone(base_group_cnt);
        return Promise.resolve().then(function() {
          return runqueue_service._Poll();
        }).then(function(result) {
          clean_poll_result(result);
          return result.should.deep.equal([
            {
              pre_group_cnt: base_group_cnt
            }, {
              post_group_cnt: post_group_cnt
            }, {
              next_jobs: []
            }
          ]);
        })["catch"](function(result) {
          _log(result);
          if (result.body) {
            result.body.should.deep.equal({});
          }
          throw result;
        });
      });
      return it('_Poll the job after success/remove (should be no waiting jobs for 20 seconds)', function() {
        var post_group_cnt;
        post_group_cnt = _.clone(base_group_cnt);
        return Promise.delay(1000).then(function() {
          return runqueue_service._Poll();
        }).then(function(result) {
          clean_poll_result(result);
          return result.should.deep.equal([
            {
              pre_group_cnt: base_group_cnt
            }, {
              post_group_cnt: post_group_cnt
            }, {
              next_jobs: []
            }
          ]);
        })["catch"](function(result) {
          _log(result);
          if (result.body) {
            result.body.should.deep.equal({});
          }
          throw result;
        });
      });
    });
    describe('test HealthCheck', function() {
      var expected, topic;
      topic = 'topic_success';
      expected = {
        status: 'g',
        details: {}
      };
      it('Everything is OK', function() {
        return Promise.resolve().then(function() {
          return runqueue_service.HealthCheck(ctx);
        }).then(function(result) {
          return result.should.deep.equal(expected);
        });
      });
      it('Topic is delayed', function() {
        return Promise.resolve().then(function() {
          var payload;
          payload = _.merge({}, {
            topic: topic,
            run_at: [-4, 'm'],
            json: health_check_json,
            unique_key: 'HealthCheck_delayed'
          });
          return runqueue_service.AddJob(ctx, payload);
        }).then(function() {
          return runqueue_service.HealthCheck(ctx);
        }).then(function(result) {
          var delay;
          delay = result.details.delays[0].delay;
          delay.should.be.above(239);
          expected.status = 'y';
          expected.details.delays = [
            {
              topic: topic,
              delay: delay
            }
          ];
          return result.should.deep.equal(expected);
        });
      });
      it('Topic has retries', function() {
        var expected_retries;
        expected_retries = 4;
        return Promise.resolve().then(function() {
          var payload;
          payload = _.merge({}, {
            topic: topic,
            run_at: [0, 's'],
            json: health_check_json,
            unique_key: 'HealthCheck_retried'
          });
          return runqueue_service.AddJob(ctx, payload);
        }).then(function(job) {
          var fail_promises, values;
          values = {
            last_reason: 'forced fail',
            run_at: moment().format()
          };
          fail_promises = (function() {
            var i, ref, results;
            results = [];
            for (i = 1, ref = expected_retries; 1 <= ref ? i <= ref : i >= ref; 1 <= ref ? i++ : i--) {
              results.push(runqueue_service.sdb.runqueue.Fail(ctx, job[0].id, values));
            }
            return results;
          })();
          return Promise.all(fail_promises);
        }).then(function() {
          expected.details.retries = [
            {
              topic: topic,
              max_retries: expected_retries
            }
          ];
          return runqueue_service.HealthCheck(ctx);
        }).then(function(result) {
          return result.should.deep.equal(expected);
        });
      });
      return it('Topic has failures (timeout)', function() {
        return Promise.resolve().then(function() {
          var payload;
          payload = _.merge({}, {
            topic: topic,
            run_at: [0, 's'],
            json: health_check_json,
            unique_key: 'HealthCheck_failure'
          });
          return runqueue_service.AddJob(ctx, payload);
        }).then(function(job) {
          var fail_at;
          fail_at = moment().add(-1, 's').format();
          return runqueue_service.sdb.runqueue.MarkJobPending(ctx, job[0].id, {
            fail_at: fail_at
          });
        }).then(function() {
          expected.status = 'r';
          expected.details.failures = [
            {
              topic: topic,
              failures: 1
            }
          ];
          return runqueue_service.HealthCheck(ctx);
        }).then(function(result) {
          return result.should.deep.equal(expected);
        });
      });
    });
    return describe('Finalize, query for expected jobs in DB: ', function() {
      var group_ref, run_at, topic;
      topic = 'my_test_topic';
      group_ref = 'SampleTest';
      run_at = false;
      return it('Only the jobs we expect', function() {
        return Promise.resolve().then(function() {
          return db.SqlQuery("SELECT * FROM runqueue WHERE json != ? ORDER BY ID", [health_check_json]);
        }).then(function(db_rows) {
          clean_db_jobs(db_rows);
          return db_rows.should.deep.equal(jobs_to_expect_at_the_end);
        });
      });
    });
  });

}).call(this);
