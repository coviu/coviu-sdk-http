var request = require('request');
require('es6-promise').polyfill();
var utils = require('./libs/interpreter-utils');

/** Handle the raw http response, possibly parsing a json response body */
var handle = exports.handleResponse = function (resolve, reject) {
  return function(err, res){
    if (err) return reject(err);
    if (!utils.httpSuccess(res.statusCode)) {
      // Attempt to unpack the body. This replicates the behaviour in `fetch-interpreter`.
      var body = res.body;
      try {
        body = JSON.parse(res.body)
      } catch (e) {}

      return reject({err: 'http request failed',
        statusCode: res.statusCode,
        body: body,
        headers: res.headers,
        reqHeaders: res.req._headers,
        path: res.req.path
      });
    }
    if (typeof res.body === 'string' && res.body.length > 0) return resolve(JSON.parse(res.body));
    resolve(res.body);
  };
};

/** Execute the request. This just collapses the list of partial requests into a single Object,
 * attaches and auth, builds the object used by the request library. Notice that I'm also executing
 * any mapping functions on the result. This is a bit nasty, but pretty useful */
exports.run = function(des) {
  var render = des.reduce();
  var validationFailure = utils.validateShape(render);

  if (validationFailure) {
    return new Promise(function(accept, reject){reject(validationFailure)});
  }

  var req = {};
  req.url = utils.url([render.HOST, render.PATH]);
  if (render.FORM) req.form = render.FORM;
  if (render.BODY) req.body = render.BODY;
  if (render.JSON) req.json = render.JSON;
  if (render.QUERY) req.url = req.url + utils.buildQueryString(render.QUERY);
  return utils.attachAuth(render.AUTH, req).then(function(req){
    return new Promise(function(resolve, reject) {
      return request[render.METHOD](req, handle(resolve, reject));
    }).then(utils.applyMap(render));
  });
};
