// Generated by CoffeeScript 1.8.0
(function() {
  exports.start = function() {
    var Error, Kit, Logger, M, Q, config, handler, kit, log, mod, nm, opts, path, q_result, restify, route, routePath, server, service, servicePath, _, _i, _len, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6;
    M = require('moment');
    Q = require('q');
    restify = require('restify');
    _ = require('lodash');
    path = require('path');
    M.defaultFormat = 'YYYY-MM-DD HH:mm:ss';
    Kit = require('./lib/kit').Kit;
    config = (require('./config'))();
    Logger = require('./lib/logger').Logger;
    Error = require('./lib/error');
    kit = new Kit;
    kit.add_service('config', config);
    kit.new_service('logger', Logger);
    kit.add_service('error', Error);
    log = kit.services.logger.log;
    server = restify.createServer({
      log: log
    });
    kit.add_service('server', server);
    _ref = kit.services.config.service_modules;
    for (nm in _ref) {
      mod = _ref[nm];
      if (!(mod.enable === true)) {
        continue;
      }
      log.info("Initializing " + mod["class"] + " Service...");
      opts = mod.instConfig ? [mod.instConfig] : null;
      servicePath = path.join(config.processDir, mod.file);
      kit.new_service(mod.name, (require(servicePath))[mod["class"]], opts);
    }
    _ref1 = config.restify.handlers;
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      handler = _ref1[_i];
      log.info("(restify handler) Server.use " + handler, config.restify[handler]);
      server.use(restify[handler](config.restify[handler]));
    }
    log.info("(restify) Server.opts", config.restify.allow_headers);
    server.opts(/.*/, (function(_this) {
      return function(req, res) {
        var _ref2;
        res.setHeader('access-control-allow-headers', ((_ref2 = config.restify.allow_headers) != null ? _ref2 : []).join(', '));
        return res.send(204);
      };
    })(this));
    _ref2 = kit.services;
    for (nm in _ref2) {
      service = _ref2[nm];
      if (typeof service.server_use === 'function') {
        server.use(service.server_use);
      }
    }
    server.use(function(req, res, next) {
      if ("JSON" in req.params) {
        _.merge(req.params, JSON.parse(req.params.JSON));
      }
      return next();
    });
    server.use(function(req, res, next) {
      var param;
      for (param in req.params) {
        if (req.params[param] !== null && _.isString(req.params[param])) {
          req.params[param] = req.params[param].replace(/[<>]/g, "");
        }
      }
      return next();
    });
    _ref3 = kit.services.config.route_modules;
    for (nm in _ref3) {
      mod = _ref3[nm];
      if (!(mod.enable === true)) {
        continue;
      }
      log.info("Initializing " + mod["class"] + " Routes...");
      routePath = path.join(config.processDir, mod.file);
      kit.new_route_service(mod.name, (require(routePath))[mod["class"]]);
      kit.services.wrapper.add(mod.name);
    }
    q_result = Q.resolve();
    _ref4 = kit.services;
    for (nm in _ref4) {
      service = _ref4[nm];
      if (typeof service.server_init === 'function') {
        (function(service) {
          return q_result = q_result.then(function() {
            return service.server_init(kit);
          });
        })(service);
      }
    }
    _ref5 = kit.routes;
    for (nm in _ref5) {
      route = _ref5[nm];
      if (typeof route.server_init === 'function') {
        (function(route) {
          return q_result = q_result.then(function() {
            return route.server_init(kit);
          });
        })(route);
      }
    }
    _ref6 = kit.services;
    for (nm in _ref6) {
      service = _ref6[nm];
      if (typeof service.server_start === 'function') {
        (function(service) {
          return q_result = q_result.then(function() {
            return service.server_start(kit);
          });
        })(service);
      }
    }
    return q_result.then(function() {
      var defer, err;
      server.get(/.*/, restify.serveStatic(config.api.static_file_server));
      defer = Q.defer();
      try {
        server.listen(config.api.port, function() {
          log.info('Server listening at', server.url);
          return defer.resolve(null);
        });
      } catch (_error) {
        err = _error;
        defer.reject(err);
      }
      return defer.promise;
    }).fail(function(err) {
      log.error(err);
      log.error('SERVER FAILED TO INITIALIZE. EXITING NOW!');
      return process.exit(1);
    });
  };

}).call(this);
