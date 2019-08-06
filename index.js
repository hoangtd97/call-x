'use strict';

const stringify = require('json-stringify-safe');
const request   = require('request');
const _get      = require('lodash.get');

const f = {
  async callAPI(di, config, ...args) {
    let { transform, before, after, handler, resPath } = config;
  
    let data = args[0] || {};
  
    if (typeof transform === 'function') {
      data = transform(...args);
    }
  
    let it = { started_at: Date.now(), config : { ...config, ...data }, ...data };
  
    if (it.params) {
      it.config.url = f.compile(it.config.url, it.params);
    }
  
    f.removePrivateFields(di.privateFields, it.config);
  
    try {
      if (typeof before === 'function') {
        await before(it);
      }
  
      it.res  = await requestPromise(it.config);
      it.time = Date.now() - it.started_at;
  
      di.writeSuccessLog(it);
  
      if (typeof resPath === 'string') {
        it.res = _get(it.res, resPath);
      }
  
      if (typeof after === 'function') {
        await after(it);
      }
  
      return it.res;
    }
    catch (error) {
      it.time = Date.now() - it.started_at;
      it.error = error;
  
      di.writeErrorLog(it);
  
      if (typeof handler === 'function') {
        return handler(it);
      }
  
      throw error;
    }
  },
  requestPromise(config) {
    return new Promise((resolve, reject) => {
      return request(config, (err, res) => {
        if (err) {
          return reject(err);
        }
        if (res.statusCode >= 400) {
          return reject({ response : res });
        }
        return resolve(res);
      });
    });
  },
  now() { return new Date().toLocaleDateString('en-US', {
    year   : 'numeric',
    month  : '2-digit',
    day    : 'numeric',
    hour   : 'numeric',
    minute : 'numeric',
    second : 'numeric'
  })},
  WriteSuccessLog(now) {
    return function writeSuccessLog({ res, time }) {
      console.log(`[ OK  ] [${now()}] ${res.request.method.toUpperCase()} ${res.request.uri.href} ${res.statusCode} ${time}ms`);
    }
  },
  WriteErrorLog(now) {
    return function writeErrorLog({ error, config, time }) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        let res = error.response;
        console.log(`[ERROR] [${now()}] ${String(config.method).toUpperCase()} ${res.request.uri.href} ${res.statusCode} ${time}ms ${res.statusMessage} ${JSON.stringify(res.body)}`);
    
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log(`[ERROR] [${now()}] ${config.method} ${config.baseURL + config.url} ${time}ms ${stringify(error)}`);
      }
    }
  },
  compile(template, data) {
    let result = template.toString ? template.toString() : '';
    result = result.replace(/{.+?}/g, function (matcher) {
      var path = matcher.slice(1, -1).trim();
      return data[path];
    });
    return result;
  },
  removePrivateFields(privateFields, config) {
    for (let field of privateFields) {
      delete config[field];
    }
  },
  injectConfig({ service, config, excludes = {}, root = '' }) {
    for (let api in service) {
      if (!(typeof service[api] === 'object')) { continue }
  
      let apiPath = [root, api].join('.');
  
      if (typeof service[api].url === 'string') {
        for (let field in config) {
          if (!service[api][field]) {
            if (!(Array.isArray(excludes[apiPath]) && excludes[apiPath].includes(field))) {
              service[api][field] = config[field];
            }
          }
        }
      }
      else {
        injectConfig({ service : service[api], config, excludes, root : apiPath });
      }
    }
  }
};

/**
 * @param {object} di
 * @param {string[]} di.privateFields will be remove from config before send request
 * @param {() => string} di.now create log time string
 * @param {function} di.writeSuccessLog 
 * @param {function} di.WriteErrorLog 
 */
function CallAPI(di) {
  di = Object.assign({
    privateFields   : ['before', 'after', 'handler', 'resPath', 'simple_data', 'user', 'params'],
    now             : f.now,
  }, di);

  di.writeSuccessLog = di.writeSuccessLog || f.WriteSuccessLog(di.now);
  di.writeErrorLog   = di.writeErrorLog || f.WriteErrorLog(di.now);

  return function callAPI(...args) {
    return f.callAPI(di, ...args);
  }
}


module.exports = { callAPI : CallAPI(), CallAPI, injectConfig : f.injectConfig };