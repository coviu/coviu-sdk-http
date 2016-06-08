require('es6-promise').polyfill();

var querystring = require('querystring');
var shapeful = require('shapeful');

exports.url = function (p){
  return p.join('');
}

exports.buildQueryString = function (query) {
  var q = exports.urlEncode(query);
  return q.length > 0 ? '?' + q : '';
}

exports.urlEncode = function (body) {
  return querystring.encode(body);
}

exports.httpSuccess = function (statusCode) {
  return statusCode >= 200 && statusCode < 300;
}

exports.escapse = querystring.escape;


/** Our users may choose to provide an object with e.g. username and password, or the might
 *  provide a function that, when called, will result in a promise returning an object that
 *  can be used as auth. This allows us to defer any checks about access token expiry until
 *  we are actually building the final request */
exports.attachAuth = function (auth, req) {
  if (typeof auth === 'function') {
    return auth().then(function(a){
      req.auth = a; return req});
  } else {
    return new Promise(function(resolve){
      if (auth) req.auth = auth;
      resolve(req);
    });
  }
};

exports.applyMap = function(render) {
  return function(result){
    if (render.MAP) return render.MAP.reduce(function(carry, fn) {
      return fn(carry);
    }, result);
    return result;
  };
};


exports.validateShape = function(render) {
  var failure = false;
  if (render.BODY_SHAPE) {
    if (!shapeful(render.BODY || {}, render.BODY_SHAPE)) {
      failure = {
        msg: 'Error in request body shape',
        expected: render.BODY_SHAPE,
        received: render.BODY
      };
    }
  }

  if (!failure && render.QUERY_SHAPE) {
    if (!shapeful(render.QUERY || {}, render.QUERY_SHAPE)) {
      failure = {
        msg: 'Error in request query shape',
        expected: render.QUERY_SHAPE,
        received: render.QUERY
      };
    }
  }
  return failure;
};
