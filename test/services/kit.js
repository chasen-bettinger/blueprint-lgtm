// Generated by CoffeeScript 1.9.2
(function() {
  var Kit, MockRoute, MockService, MockWrapper, chai, funcTarget, mockFunc;

  chai = require('chai');

  Kit = require('../../lib/kit').Kit;

  chai.should();

  funcTarget = false;

  mockFunc = function() {
    return funcTarget = true;
  };

  MockService = (function() {
    MockService.deps = {};

    function MockService(kit, opt) {
      this.val = opt;
      kit.services['mockFunc']();
    }

    return MockService;

  })();

  MockWrapper = (function() {
    MockWrapper.deps = {};

    function MockWrapper(kit, opts) {}

    return MockWrapper;

  })();

  MockRoute = (function() {
    MockRoute.deps = {};

    function MockRoute(kit, opts) {
      this.val = opts != null ? opts : false;
      kit.services['mockFunc']();
    }

    return MockRoute;

  })();

  describe('Kit', function() {
    var kit;
    kit = new Kit;
    it('should have a place to store services and routes', function() {
      kit.should.have.property('services');
      kit.should.have.property('routes');
      kit.should.respondTo('add_service');
      kit.should.respondTo('new_service');
      kit.should.respondTo('add_route_service');
      return kit.should.respondTo('new_route_service');
    });
    it('should add a function or object to services', function() {
      kit.add_service('my_object', {
        p1: 1,
        p2: 2
      });
      kit.services.should.have.property('my_object');
      kit.services.my_object.p1.should.equal(1);
      kit.add_service('mockFunc', mockFunc);
      kit.services['mockFunc']();
      return funcTarget.should.be["true"];
    });
    it('should create a new instance and add to services', function() {
      funcTarget = false;
      funcTarget.should.be["false"];
      kit.new_service('my_service', MockService, ['my_arg']);
      kit.services.my_service.should.be.an["instanceof"](MockService);
      kit.services.my_service.val.should.equal('my_arg');
      return funcTarget.should.be["true"];
    });
    return it('should create a new route instance and add to routes', function() {
      funcTarget = false;
      funcTarget.should.be["false"];
      kit.new_service('wrapper', MockWrapper, ['my_arg']);
      kit.new_route_service('my_route', MockRoute, ['my_arg']);
      kit.routes.my_route.should.be.an["instanceof"](MockRoute);
      kit.routes.my_route.val.should.equal('my_arg');
      return funcTarget.should.be["true"];
    });
  });

}).call(this);
