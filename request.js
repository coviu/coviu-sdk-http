/** Request provides an immutable 'fluent' api for describing a request. It should be interpredted by an executor
 * that may choose to run the request on an http client */

var curry = require('curry');

var request = curry(function(name, tail, value) {
  function addQuery(name) {
    return function(v){return request(name, req, v);};
  }
  var req = {
    name: name,
    value: value,
    tail: tail,
    host: addQuery('HOST'),
    path: addQuery('PATH'),
    method: addQuery('METHOD'),
    auth: addQuery('AUTH'),
    body: addQuery('BODY'),
    form: addQuery('FORM'),
    json: addQuery('JSON'),
    query: addQuery('QUERY'),
    map: addQuery('MAP'),
    debug: addQuery('DEBUG'),
    bodyShape: addQuery('BODY_SHAPE'),
    queryShape: addQuery('QUERY_SHAPE'),
    interpreter: addQuery('INTERPRETER'),
    get: function(){return req.method('get');},
    post: function(){return req.method('post');},
    put: function(){return req.method('put');},
    del: function(){return req.method('del');},
    /** update a request parameter with a function that takes the existing value of the parameter */
    update: function(param, fn) {
      return request(param, req, fn(exports.query(param)));
    },
    subpath: function(v) {
      return req.path(exports.query(req, 'PATH') + v);
    },
    run: function(){
      return exports.query(req, 'INTERPRETER').run(req);
    },
    reduce: function() { return exports.reduce(req);}
  };
  return req;
});


/** The nil request can has no effect and may be used as a termination symbol */
exports.nil = request('NULL', null, null);

/** request export is the default way of constructing a new request root. It takes a host around
 *  and returns a get request to that host.*/
exports.request = exports.nil.path('/').get().host;

/** collapse the request down to a set of key ->  value pairs */
exports.reduce = function(req) {
  var carry;
  if (req.tail) carry = exports.reduce(req.tail, carry);
  else carry = {};
  // We need to accumulate the mapping functions
  if (req.name === 'MAP') {
    if (typeof carry[req.name] === 'undefined') carry[req.name] = [req.value];
    else carry[req.name].push(req.value);
  }
  else carry[req.name] = req.value;
  return carry;
};

/** Query the current parameter out of the request */
exports.query = function(req, parameter) {
  return exports.reduce(req)[parameter];
}
