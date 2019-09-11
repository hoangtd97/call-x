import { CoreOptions, Response } from 'request';

//----------------- VALUES ---------------//

declare const callAPI : callAPI;

export default callAPI;

export function CallAPI (di : CallApiDependencies) : callAPI;

export function injectConfig(options : InjectConfigOptions) : void;

//----------------- TYPES ----------------//
export type callAPI = 
((config : StaticConfig, data ?: DynamicData) => Promise<Response | any>) |
((config : StaticConfig, ...args : any[]) => Promise<Response | any>);

export interface FinalConfig extends CoreOptions {}

export interface StaticConfig extends FinalConfig {
  /** template with params enclosed in bracket {}, ex : `order/{id}` */
  url       ?: string;
  /** the path of data will be get from response, ex : `body.items`  */
  resPath   ?: string;
  transform ?: (...args : any[]) => DynamicData;
  before    ?: (it : It) => void;
  after     ?: (it : It) => void;
  handler   ?: (it : It) => void;
}

export interface DynamicData extends FinalConfig {
  /** url params, used to compile url template  */
  params    ?: object;
}

export interface It {
  config	    : StaticConfig;
  data        : DynamicData;
  /** final config pass to agent */
  finalConfig : FinalConfig;
  /** timestamp */
  startedAt	  : number;
  /** from startedAt to finish or fail */
  time        ?: number;
  res	        ?: Response | null;
  error       ?: Error | null;
}

export interface CallApiDependencies {
  /** List private fields will be remove from it.finalConfig before send*/
  privateFields   ?: string[];
  writeSuccessLog ?: (it : It) => void;
  writeErrorLog   ?: (it : It) => void;
  /** create time log string */
  now             ?: () => string;
  /** 
   * Function will be used to compile url template to url.
   * Default, replace pattern `/{field}/g` with params[field].
   * @example
   * compile('abc.com/order/{id}', { id : 1000 });
   * 
   * => 'abc.com/order/1000'
   * */
  compile         ?: (urlTemplate : string, params : object) => string;
}

export interface InjectConfigOptions {
  /**
   * @example
   * USER_SERVICE = {
   *    LOGIN  : {},
   *    SEARCH : {},
   *    UPDATE : {}
   * };
  */
  service  : object;
  /**
   * @example
   * {
   *    baseUrl : 'app.com/users',
   *    before  : it => it.headers.Authorization = it.data.user.access_token
   *    handler : it => {}
   * }
   */
  config   : StaticConfig;
  /**
   * Don't inject their config to this api 
   * @example
   * {
   *    'LOGIN' : ['before']
   * }
   */
  excludes : KeyList<string>;
}

export interface KeyList<T> {
  [key : string] : T[];
}