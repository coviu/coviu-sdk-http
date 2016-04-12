require('es6-promise').polyfill();

var querystring = require('querystring');

exports.url = function (p){
  return p.join('');
}

exports.buildQueryString = function (query) {
  var q = querystring.encode(query);
  return q.length > 0 ? '?' + q : '';
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
}
