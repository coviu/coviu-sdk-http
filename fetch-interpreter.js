require('isomorphic-fetch');
require('es6-promise').polyfill();
var utils = require('./libs/interpreter-utils');

function attachAuth(auth, req) {
  if (typeof auth === 'function') {
    return auth().then(function(a){
      req.header.set('Authorization', a)
      return req
    });
  } else {
    return new Promise(function(resolve){
      if (auth) {
        req.header.set('Authorization', auth)
      }
      resolve(req);
    });
  }
}

/** Execute the request. This just collapses the list of partial requests into a single Object,
 * attaches and auth, builds the object used by the request library. Notice that I'm also executing
 * any mapping functions on the result. This is a bit nasty, but pretty useful */
exports.run = function(des) {
  var render = des.reduce();
  var req = {
    headers: new Headers()
  };

  var url = utils.url([render.HOST, render.PATH]);

  if (render.FORM){
    req.headers.set('Content-Type', 'x-www-form-urlencoded');
    if (render.BODY && typeof render.BODY === 'object') {
      render.BODY = utils.buildQueryString(render.BODY);
    }
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

  return utils.attachAuth(render.AUTH, req).then(function(req){
    return fetch(new Request(url, req)).then(function(result){
      if (!utils.httpSuccess(result.status)) {
        return result.text().then(function(body){
          throw new Error({err: 'http request failed',
            statusCode: result.status,
            body: body,
            headers: result.headers,
            reqHeaders: req.headers,
            path: result.url
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
