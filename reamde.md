# CALL-X

## Usage

* With that full request config :
```js
let config = {
   method  : 'PUT',
   baseUrl : 'https://store.com',
   url     : 'order/1000',
   json    : true, 
   body    : body : { id : 1000, tags : ['?'] }
}
```

* can be split to 2 part :
  *  the static config 
  ```js
  let ORDER_SERVICE = {
  UPDATE : {
    method  : 'PUT',
    baseUrl : 'https://store.com',
    url     : 'order/{id}',
    json    : true
  }
  };
  ```

  * and the dynamic data :
  ```js
  let data = { 
    params : { id : 1000 }, 
    body   : { id : 1000, tags : ['?'] }
  }
  ```

* so you can call ...
```js
let res = await callAPI(ORDER_SERVICE.UPDATE, data);

res = { statusCode : 200, body : { order : { id : 1000, tags : ['?'] } } ,... };
```

* you can set resPath to get only useful data
```js
ORDER_SERVICE.UPDATE.resPath = 'body.order';

res = { id : 1000, tags : ['?'] }
```

* or set transform() to provide nicer interface
```js
ORDER_SERVICE.UPDATE.transform = (order) => Object({ params : { id : order.id }, body : order });

let order = { id : 1000, tags : ['?'] };
let res   = await callAPI(ORDER_SERVICE.UPDATE, order);
```

----------

## Support hooks : before(send request), after(receive response), handler(when error occur)

* Use before hook to add dynamic authorization
```js
let user = { access_token : 'SDJFOW30U5230T23T3T-2G3G32JGJ-22GJ03JG' };

ORDER_SERVICE.UPDATE.before = it => {
   it.config.headers = { Authorization : `Bearer ${it.data.user.access_token}` };
}
```

  * Add user to transform params
  ```js
  ORDER_SERVICE.UPDATE.transform = (order, user) => Object({ params : { id : order.id }, body : order, user });
  ```

  * and you can call
  ```js
  let res = await callAPI(ORDER_SERVICE.UPDATE, { id : 1000, tags : ['?'] }, user);
  ```

* Using handler to adapting error
```js
ORDER_SERVICE.UPDATE.handler = it => {
   if (it.error.response.statusCode >= 400 && it.error.response.statusCode < 500) {
     throw new ERR_INVALID_DATA({ message : it.it.error.response.body.message });
   }
   else {
     throw new ERR_SERVICE_FAILED({ error : it.error });
   }
}
```

## The suggested configuration

Almost API use some same config like baseUrl, json, hooks, so detach them and then inject to all.

* `api/order-service.js`
```js
const { injectConfig } = require('call-x/util');

const baseUrl = 'https://store.com';

const ORDER_SERVICE = {
  DETAIL : {
    transform : (id, user) => Object({ params : { id : order.id }, user }),
    method    : 'GET',
    url       : 'order/{id}',
    resPath   : 'body.order',
    simpleRes : {
      id : 1000,
      line_items : [{
        id : 100100,
        quantity : 2
      }]
    }
  },
  UPDATE : {
    transform : (order, user) => Object({ params : { id : order.id }, body : order, user }),
    method    : 'PUT',
    url       : 'order/{id}',
    resPath   : 'body.order',
    simpleData : {
      order : {
        id : 1000,
        tags : ['?']
      }
    },
    simpleRes : {
      id : 1000,
      tags : ['?'],
      line_items : [{
        id : 100100,
        quantity : 2
      }]
    }
  },
  POST : {},
  ....
};

function before (it) {
   it.config.headers = { Authorization : `Bearer ${it.data.user.access_token}` };
}

function handler(it) {
   if (it.error.response.statusCode >= 400 && it.error.response.statusCode < 500) {
     throw new ERR_INVALID_DATA({ message : it.it.error.response.body.message });
   }
   else {
     throw new ERR_SERVICE_FAILED({ error : it.error });
   }
}

injectConfig(ORDER_SERVICE, { baseUrl, json : true, before, handler });

module.exports = { ORDER_SERVICE };
```

* `api/index.js`
```js
const call = require('call-x');

module.exports = {
  call,
  ...require('./order-service'),
};
```

* `update-order.js`
```js
const API = require('./api');

async function updateOrder(user, order_id, data) {
  let order = await API.call(API.ORDER_SERVICE.DETAIL, order_id, user);
  // do something like validate data
  let res = await API.call(API.ORDER_SERVICE.UPDATE, data, user);
  // do something like save to database
}
```

## API

<a id="callAPI"></a>

## callAPI(config, [...args]) ⇒ <code>Promise.&lt;\*&gt;</code>
Call API, design to use pre-configure api

**Returns**: <code>Promise.&lt;\*&gt;</code> - [http response](https://nodejs.org/api/http.html#http_class_http_serverresponse)  
**Note**: wrap [request](https://www.npmjs.com/package/request) package  

| Param | Type | Description |
| --- | --- | --- |
| config | <code>StaticConfig</code> | static [request config](https://www.npmjs.com/package/request#requestoptions-callback) |
| [...args] | <code>DynamicConfig</code> \| <code>any</code> | dynamic config data or list arguments pass to config.transform() |

<a name="AgentConfig"></a>

## AgentConfig : <code>Object.&lt;string, any&gt;</code>

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| url | <code>string</code> | template with params enclosed in bracket {}, ex : order/{id} |
| resPath | <code>string</code> | the path of data will be get from response |
| transform | <code>function</code> |  |
| before | <code>function</code> |  |
| after | <code>function</code> |  |
| handler | <code>function</code> |  |
| params | <code>object</code> | url params, used to compile url template |
| qs | <code>object</code> | query object |
| body | <code>object</code> |  |
| url | <code>string</code> |  |

<a name="It"></a>

## It : <code>Object.&lt;string, any&gt;</code>
The API calling context

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| config | <code>StaticConfig</code> | static api config |
| data | <code>DynamicConfig</code> | dynamic api config data |
| agentConfig | [<code>AgentConfig</code>](#AgentConfig) | final config pass to agent |
| started_at | <code>number</code> | timestamp |
| time | <code>number</code> | to finish call (ms) = Date.now() - started_at |
| res | <code>Response</code> \| <code>null</code> | response, when success |
| error | <code>object</code> \| <code>null</code> | when failed |

