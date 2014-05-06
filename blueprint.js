// Generated by CoffeeScript 1.6.3
(function() {
  var Auth, Db, EpicTemplate, Kit, Logger, Prototype, Push, Q, Router, SES, TokenMgr, TripManager, Wrapper, config, kit, log, mod, nm, q_result, restify, s_use, server, service, _i, _len, _ref, _ref1;

  Q = require('q');

  restify = require('restify');

  Kit = require('./lib/kit').Kit;

  Db = require('./lib/db').Db;

  s_use = require('./lib/server_use');

  config = (require('./lib/config'))();

  SES = require('./lib/ses').SES;

  Push = require('./lib/push').Push;

  Auth = require('./lib/auth').Auth;

  Logger = require('./lib/logger').Logger;

  Router = require('./lib/router').Router;

  Wrapper = require('./lib/wrapper').Wrapper;

  TokenMgr = require('./lib/token_manager').TokenMgr;

  Prototype = require('./lib/prototype').Prototype;

  TripManager = require('./lib/trip_manager').TripManager;

  EpicTemplate = require('./lib/EpicTemplate').EpicTemplate;

  kit = new Kit;

  kit.add_service('config', config);

  kit.new_service('logger', Logger);

  log = kit.services.logger.log;

  server = restify.createServer({
    log: log
  });

  kit.add_service('server', server);

  kit.new_service('template', EpicTemplate, ['template']);

  kit.new_service('template_use', EpicTemplate, ['template_use']);

  kit.new_service('tokenMgr', TokenMgr);

  kit.new_service('db', Db);

  kit.new_service('auth', Auth);

  kit.new_service('router', Router);

  kit.new_service('push', Push);

  kit.new_service('wrapper', Wrapper);

  kit.new_service('prototype', Prototype);

  kit.new_service('ses', SES);

  kit.new_service('tripMgr', TripManager);

  server.use(s_use.set_response_headers);

  server.use(restify.queryParser());

  server.use(restify.bodyParser());

  server.use(restify.requestLogger());

  server.use(kit.services.auth.parseAuthorization);

  server.use(s_use.debug_request);

  _ref = kit.services.config.route_modules;
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    mod = _ref[_i];
    if (!(mod.enable === true)) {
      continue;
    }
    log.info("Initializing " + mod["class"] + " Routes...");
    kit.new_route_service(mod.name, (require(mod.file))[mod["class"]]);
    kit.services.wrapper.add(mod.name);
  }

  kit.services.router.route_usage();

  log.debug('running server_init()');

  q_result = Q.resolve();

  _ref1 = kit.services;
  for (nm in _ref1) {
    service = _ref1[nm];
    if (typeof service.server_init === 'function') {
      (function(service) {
        return q_result = q_result.then(function() {
          return service.server_init(kit);
        });
      })(service);
    }
  }

  q_result.then(function() {
    server.get(/.*/, restify.serveStatic(config.api.static_file_server));
    return server.listen(config.api.port, function() {
      return log.info('Server listening at', server.url);
    });
  }).fail(function(err) {
    log.error(err);
    log.error('SERVER FAILED TO INITIALIZE. EXITING NOW!');
    return process.exit(1);
  });

}).call(this);
