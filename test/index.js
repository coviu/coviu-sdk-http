var request = require('../request');
var interpreter = require('../request-interpreter');
var fetchInterpreter = require('../fetch-interpreter');
var utils = require('../libs/interpreter-utils');

var assert = require('assert');

describe('request', function(){
  var req = request.request('http://localhost:9000');

  it('should attach a host', function(){
    assert(request.reduce(req).HOST === 'http://localhost:9000');
  });

  it('should set the method', function(){
    assert(request.reduce(req.get()).METHOD === 'get');
  });

  it('should set the method', function(){
    assert(request.reduce(req.get().path('/foo')).PATH === '/foo');
  });

  it('should accumulate all attributes', function(){
    var res = request.reduce(req.path('/foo').post().body('string').auth('foobar'));
    assert(res.PATH === '/foo');
    assert(res.METHOD === 'post');
    assert(res.BODY === 'string');
    assert(res.AUTH === 'foobar');
    assert(res.HOST === 'http://localhost:9000');
  });

  it('overwrites attributes', function(){
    assert(request.reduce(req.path('/foo').path('/bar')).PATH === '/bar');
  });

  it('can be run against an interpreter and have a result returned', function(){
    var req = request.request('https://monitor.coviu.com');
    return interpreter.run(req).then(function(res){
      assert(typeof res !== 'undefined');
    })
  });

  it('can be run against the fetch interpreter and have a result returned', function(){
    var req = request.request('https://monitor.coviu.com');
    return fetchInterpreter.run(req).then(function(res){
      assert(typeof res !== 'undefined');
    })
  });

  it('can map over the result', function(){
    var req = request.request('https://monitor.coviu.com').map(function(res){return 'A'});
    return interpreter.run(req).then(function(res){
      assert(res === 'A');
    })
  });

  it('the order of functions mapping functions is maintained.', function(){
    var req = request.request('https://monitor.coviu.com')
    .map(function(res){return 'A'})
    .map(function(res){assert(res === 'A'); return 'B'});
    return interpreter.run(req).then(function(res){
      assert(res === 'B');
    })
  });

  it('doesn\' evaulate the auth parameter until the request is interpreted.', function(){
    req.auth(function(){assert(false)});
  });

  it('can append values to the path using subpath', function(){
    assert(request.query(req.path('/foo').subpath('/bar'), 'PATH') === '/foo/bar');
  });

  it('body validation can be applied', function() {
    assert(!utils.validateShape(req.bodyShape('string').body('string').reduce()));
    assert(utils.validateShape(req.bodyShape('string').body(true).reduce()));
    assert(!utils.validateShape(req.bodyShape({key: 'string', val:'boolean'}).body({key: 'fo', val: false}).reduce()));
  });

  it('query validation can be applied', function() {
    assert(!utils.validateShape(req.queryShape('string').query('string').reduce()));
    assert(utils.validateShape(req.queryShape('string').query(true).reduce()));
    assert(!utils.validateShape(req.queryShape({key: 'string', val:'boolean'}).query({key: 'fo', val: false}).reduce()));
  });
});
