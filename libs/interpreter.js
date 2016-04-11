/** An interpreter can run a request against a specific http client library. In this case we use the request library.
 * TODO: also introduce a circuit breaker around each distinct host. */

var request = require('request');
var Promise = require('es6-promises');
var querystring = require('querystring');

function service(){
  return {
    get: function(attr, cb){return request.get(attr, cb)},
    post: function(attr, cb){return request.post(attr, cb)},
    put: function(attr, cb){return request.put(attr, cb)},
    del: function(attr, cb){return request.del(attr, cb)},
  }
};

function url(p){
  return p.join('');
}

function buildQueryString(query) {
  var q = querystring.encode(query);
  return q.length > 0 ? '?' + q : '';
}

function httpSuccess(statusCode) {
  return statusCode >= 200 && statusCode < 300;
}

var services = {};

var escapse = querystring.escape;

/** Handle the raw http response, possibly parsing a json response body */
var handle = exports.handleResponse = function (resolve, reject) {
  return function(err, res){
    if (err) return reject(err);
    if (!httpSuccess(res.statusCode)) return reject({err: 'http request failed',
      statusCode: res.statusCode,
      body: res.body,
      headers: res.headers,
      reqHeaders: res.req._headers,
      path: res.req.path
    });
    if (typeof res.body === 'string' && res.body.length > 0) return resolve(JSON.parse(res.body));
    resolve(res.body);
  };
};

/** Our users may choose to provide an object with e.g. username and password, or the might
 * provide a function that, when called, will result in a promise returning an object that
 * can be used as auth. This allows us to defer any checks about access token expiry until
 * we are actually building the final request */
function attachAuth(auth, req) {
  if (typeof auth === 'function') {
    return auth().then(function(a){
      req.auth = a; return req});
  } else {
    return new Promise(function(resolve){
      if (auth) req.auth = auth;
      resolve(req)
    });
  }
}

/** Execute the request. This just collapses the list of partial requests into a single Object,
 * attaches and auth, builds the object used by the request library. Notice that I'm also executing
 * any mapping functions on the result. This is a bit nasty, but pretty useful */
exports.run = function(des) {
  var render = des.reduce();
  var req = {};
  req.url = url([render.HOST, render.PATH]);
  if (render.FORM) req.form = render.FORM;
  if (render.BODY) req.body = render.BODY;
  if (render.JSON) req.json = render.JSON;
  if (render.QUERY) req.url = req.url + buildQueryString(render.QUERY);
  return attachAuth(render.AUTH, req).then(function(req){
    // TODO: introduce a new circuit breaker around each distinct host.
    if (typeof services[render.HOST] === 'undefined') services[render.HOST] = service();
    return new Promise(function(resolve, reject) {
      return services[render.HOST][render.METHOD](req, handle(resolve, reject));
    }).then(function(result){
      if (render.MAP) return render.MAP.reduce(function(carry, fn){return fn(carry);}, result);
      return result;
    })
  });
};
