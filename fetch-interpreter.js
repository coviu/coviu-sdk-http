require('isomorphic-fetch');
require('es6-promise').polyfill();
var utils = require('./libs/interpreter-utils');
var btoa = require('btoa');
var formurlencoded = require('form-urlencoded');

function buildAuthHeader(auth) {
  if (typeof auth === 'object') {
    if (typeof auth.user !== 'undefined') return 'Basic '+ btoa(auth.user +':' + auth.pass);
    else if (typeof auth.bearer !== 'undefined') return 'Bearer ' + auth.bearer
  }
  return auth;
}

function attachAuth(auth, req) {
  if (typeof auth === 'function') {
    return auth().then(function(a){
      req.headers.set('Authorization', buildAuthHeader(a));
      return req
    });
  } else {
    return new Promise(function(resolve){
      if (auth) {
        req.headers.set('Authorization', buildAuthHeader(auth))
      }
      resolve(req);
    });
  }
}

function mapMethod(method) {
  return {
    'get': 'GET',
    'post': 'POST',
    'put': 'PUT',
    'del': 'DELETE'
  }[method];
}
/** Execute the request. This just collapses the list of partial requests into a single Object,
 * attaches and auth, builds the object used by fetch. Notice that I'm also executing
 * any mapping functions on the result. This is a bit nasty, but pretty useful */
exports.run = function(des) {
  var render = des.reduce();
  var req = {
    headers: new Headers(),
    method: mapMethod(render.METHOD)
  };

  var url = utils.url([render.HOST, render.PATH]);
  if (render.FORM){
    req.headers.set('Content-Type', 'application/x-www-form-urlencoded');
    render.BODY = formurlencoded(render.FORM);
  }

  if (render.JSON){
    req.headers.set('Content-Type', 'application/json');
    if (render.BODY && typeof render.BODY === 'object') {
      render.BODY = JSON.stringify(render.BODY);
    }
  }

  if (render.BODY) {
   req.body = render.BODY;
   req.headers['Content-Length'] = req.body.length.toString();
  }


  if (render.QUERY) url = url + utils.buildQueryString(render.QUERY);

  return attachAuth(render.AUTH, req).then(function(req){
    return fetch(new Request(url, req)).then(function(result){
      if (!utils.httpSuccess(result.status)) {
        return result.text().then(function(body){
          throw new Error({err: 'http request failed',
            statusCode: result.status,
            body: body,
            headers: JSON.stringify(result.headers),
            reqHeaders: JSON.stringify(req.headers),
            url: result.url,
            reqBody: req.body
          });
        });
      }
      var contentType = result.headers.get("content-type");
      if(contentType && contentType.indexOf("application/json") !== -1) {
        return result.json();
      }
      return result.text();
    }).then(utils.applyMap(render));
  });
};
