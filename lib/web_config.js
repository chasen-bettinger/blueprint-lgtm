// Generated by CoffeeScript 1.9.2
(function() {
  var WebConfig,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  WebConfig = (function() {
    WebConfig.deps = {
      services: ['config', 'logger'],
      config: 'web.config_document',
      server: true
    };

    function WebConfig(kit) {
      this.server_start = bind(this.server_start, this);
      var f;
      f = 'WebConfig:constructor';
      this.config = kit.services.config.web;
      this.log = kit.services.logger.log;
    }

    WebConfig.prototype.server_start = function(kit) {
      var f, path, server;
      f = 'WebConfig:server_start:';
      server = kit.services.server.server;
      path = /\/config.js$/;
      this.log.debug(f, "Adding GET " + path);
      return server.get(path, (function(_this) {
        return function(req, res, next) {
          res.header('Content-Type', 'text/plain');
          res.send(200, _this.config.config_document);
          return next;
        };
      })(this));
    };

    return WebConfig;

  })();

  exports.WebConfig = WebConfig;

}).call(this);
