// deps
const isEqual = require('lodash.isequal');
const NATIVE_CONSTRUCTORS = [
  Object,
  Function,
  Boolean,
  Error,
  SyntaxError,
  TypeError,
  ReferenceError,
  Number,
  Math,
  Date,
  RegExp,
  Array,
  Map,
  Set,
  ArrayBuffer,
  Date,
  String,
];

class Pair {
  constructor(a, b) {
    this.a = a;
    this.b = b;
  }

  /**
   * @param {Pair} pair
   * @return {boolean}
   */
  equals(pair) {
    return (
      (this.a === pair.a && this.b === pair.b) ||
      (this.a === pair.b && this.b === pair.a)
    );
  }

  toHash() {
    return [this.a, this.b].sort().join('-');
  }

  get() {
    return [this.a, this.b];
  }
}

/**
 * Clone an object using JSON.parse JSON.stringify method
 * @param obj
 * @return {any}
 */
function jsonClone(obj) {
  if (!obj) return null;
  const stringified = JSON.stringify(obj);
  if (!stringified) return null;
  return JSON.parse(stringified);
}

/**
 * Return true if obj is a valid (non-null) object
 *
 * @param obj
 * @param {boolean} [strict] If yes, require obj.constructor === Object
 * @return {*|boolean}
 */
function isObject(obj, strict = true) {
  return (
    obj &&
    typeof obj === 'object' &&
    (strict ? obj.constructor === Object : true)
  );
}

function isString(str) {
  return typeof str === 'string' || str instanceof String;
}

function isRegExp(obj) {
  return obj && obj.constructor === RegExp;
}

/**
 * Parse boolean from a string. Throws an error
 * if user enters something that is not an acceptable
 * boolean.
 *
 * @param {String|Boolean} _s Input string
 * @return {Boolean} true if user entered 't' or 'true', false otherwise
 */
function parseBoolean(_s) {
  if (typeof _s === 'boolean') return _s;
  const s = _s.toString().toLowerCase();
  const acceptable = ['true', 'false'];
  if (!acceptable.includes(s))
    throw new Error(
      `Invalid option ${_s}. Acceptable values for boolean option are: ${acceptable}`,
    );
  return s === 'true';
}

/**
 *
 * @param val
 * @return {boolean}
 */
function isNonNativeClassInstance(val) {
  if (!val) return false;
  return !NATIVE_CONSTRUCTORS.find(native => val.constructor === native);
}

/**
 * Return a copy of obj keys with keys in sorted order.
 * NOTE: This will RECURSIVELY sort sub-keys in obj
 * as well.
 *
 * @param obj
 * @param compareValuesFn 				Function to sort object keys
 * 										by their values. For each key (a, b),
 * 										this function will get called as:
 * 										compareValuesFn(obj[a], obj[b]). NOTE!
 * 										This will get called recursively as well!
 * 										Ensure that it does not throw an error on
 * 										sub-objects!
 */
function sortObjectKeys(obj, compareValuesFn = null) {
  const ordered = {};
  Object.keys(obj)
    .sort(
      compareValuesFn ? (a, b) => compareValuesFn(obj[a], obj[b]) : undefined,
    )
    .forEach(key => {
      if (isObject(obj[key])) obj[key] = sortObjectKeys(obj[key]);
      ordered[key] = obj[key];
    });
  return ordered;
}

function isBoolean(val) {
  return typeof val === 'boolean';
}

function isSymbol(val) {
  return typeof val === 'symbol';
}

/**
 * @description
 * Get a "diff" between obj1 and obj2. Returns an array of keys
 * with differing values.
 *
 * Implementation notes:
 * - All keys of obj2 are initially in the result.
 *
 * - If the loop finds a key (from obj1, remember) not in obj2, it adds
 *   it to the result.
 *
 * - If the loop finds a key that are both in obj1 and obj2, it compares
 *   the value. If it's the same value, the key is removed from the result.
 *
 * @param obj1
 * @param obj2
 * @return {Array<Object>}            Array of keys ['key1', 'key2', ...]
 *                                    where !_.isEqual(obj.key1, obj.key2)
 */
function getObjectDiff(obj1, obj2) {
  return Object.keys(obj1).reduce((result, key) => {
    let sorted1 = obj1[key];
    let sorted2 = obj2[key];
    if (isObject(sorted1)) sorted1 = sortObjectKeys(sorted1);
    if (isObject(sorted2)) sorted2 = sortObjectKeys(sorted2);
    if (!Object.prototype.hasOwnProperty.call(obj2, key)) {
      result.push(key);
    } else if (isEqual(sorted1, sorted2)) {
      const resultKeyIndex = result.indexOf(key);
      result.splice(resultKeyIndex, 1);
    }
    return result;
  }, Object.keys(obj2));
}

/**
 * Return true if val is a number. To check if a string is a valid number,
 * setting parse = true will cause isNumber to attempt to use parseInt on
 * val, returning true if the parse succeeded
 *
 * @param val
 * @param parse
 * @return {boolean}
 */
function isNumber(val, parse = false) {
  if (!parse) return typeof val === 'number' && isFinite(val);
  try {
    const result = parseInt(val);
    return typeof result === 'number' && isFinite(result);
  } catch (err) {
    return false;
  }
}

/**
 * Returns true if a value is undefined or null and not true
 * otherwise.
 *
 * @param val
 * @return {boolean}
 */
function isNull(val) {
  if (isObject(val)) return false;
  if (val instanceof Date) return false;
  return typeof val === 'undefined' || val === null;
}

/**
 * Recursively search for key in obj. Returns null if not found,
 * otherwise, value belonging to the key
 *
 * @param obj 				{ level1: { level2: 'somevalue' } }
 * @param key 				'level1.level2'
 * @return {null|string} 	'somevalue'
 */
function getNestedValue(obj, key) {
  if (!isObject(obj)) return null;
  const parts = key
    .split('.')
    .map(s => s.trim())
    .filter(s => s);
  if (parts.length > 1) {
    if (!obj[parts[0]]) return null;
    return getNestedValue(obj[parts[0]], parts.slice(1).join('.'));
  } else if (parts.length === 1) {
    return obj[parts[0]];
  }
  return null;
}

/**
 * Browser*
 * Check if val is a readable stream type. NOTE FOR BROWSER! This
 * require statement must be filled or "stubbed" or webpack will break!
 * @param val
 */
function isReadableStream(val) {
  const stream = require('stream');
  // check if require worked for browser compatibility
  if (stream) {
    return val instanceof stream.Readable;
  }
  return false;
}

/**
 * Object utility functions. Browser compatible.
 */
module.exports = {
  /**
   * @param {Object} obj
   * @return {Object}
   * @example
   * swapKeysAndValues({a: b}) === {b: a}
   */
  swapKeysAndValues: obj => {
    return Object.keys(obj).reduce((ret, key) => {
      ret[obj[key]] = key;
      return ret;
    }, {});
  },
  /**
   * Rename keys on obj to specification
   * in keysArr. WARNING: This method will
   * mutate obj
   *
   * @param  {Object} obj                 src object
   * @param  {Array}  keysArr            array of [fromKey, toKey] names
   *                                        keysArr ['a', 'b']
   *                                        ---
   *                                        obj { 'a': 'somevalue' }
   *                                        ->
   *                                        obj {'b': 'somevalue'}
   * @return {Object}                        Returns the original object
   */
  renameObjectKeys: (obj, keysArr) => {
    keysArr.forEach(([fromKey, toKey]) => {
      if (fromKey === toKey) return;
      if (Object.getOwnPropertyDescriptor(obj, fromKey)) {
        obj[toKey] = obj[fromKey];
        delete obj[fromKey];
      }
    });
    return obj;
  },
  /**
   * Assign key / values from b to a if they
   * are not null on b
   *
   * @param  {Object} a
   * @param  {Object} b
   * @return {Object}     returns the target object, a
   */
  assignNonNullKeys: (a, b) => {
    Object.keys(b).forEach(key => {
      if (!isNull(b[key])) a[key] = b[key];
    });
    return a;
  },
  /**
   * Return a "filtered" object only including
   * the keys specified in keysArr. WARNING:
   * the new object returned is a shallow copy of obj.
   *
   * @param   {Object}    obj            { key1: '1', key2: '2', key3: '3'}
   * @param   {Array}        keysArr        ['key1', 'key2']
   * @return  {Object}                { key1: '1', key2: '2'}
   */
  includeObjectKeys: (obj, keysArr) => {
    const result = {};
    keysArr.forEach(key => (result[key] = obj[key]));
    return result;
  },
  /**
   * Returns a "filtered" object excluding
   * the keys specified in keysArr. WARNING:
   * new object is a shallow copy of obj.
   *
   * @param   {Object}    obj            { key1: '1', key2: '2', key3: '3'}
   * @param   {Array}        keysArr        ['key1', 'key2']
   * @return  {Object}                { key3: '3' }
   */
  excludeObjectKeys: (obj, keysArr) => {
    const result = {};
    Object.keys(obj).forEach(key => {
      if (!keysArr.includes(key)) result[key] = obj[key];
    });
    return result;
  },
  /**
   * Modifies obj and deletes keys specified by keysArr.
   *
   * @param obj
   * @param keysArr
   */
  deleteObjectKeys: (obj, keysArr) => {
    for (const key of keysArr) delete obj[key];
  },
  /**
   * Return true if all of an object's values are either null or
   * undefined.
   *
   * @param obj
   * @return {boolean}
   */
  objectEmpty: obj => {
    if (!isObject(obj)) return true;
    for (const key of Object.keys(obj)) {
      if (isNull(obj[key])) continue;
      return false;
    }
    return true;
  },
  /**
   * Return an object containing only keys of obj where obj[key] is not null
   * or undefined.
   *
   * If obj[key] === '', it will also be filtered.
   *
   * @param obj
   * @return {*}
   */
  filterNullObjectKeys: obj => {
    if (!isObject(obj)) return obj;
    const res = {};
    for (const key of Object.keys(obj)) {
      if (obj[key] === '') continue;
      if (!isNull(obj[key])) res[key] = obj[key];
    }
    return res;
  },
  /**
   * Returns a new object containing only keys where filterFn returns true.
   * @param {Object} obj
   * @param {function(key:string,value:*):boolean} filterFn A function accepting params (key, value).
   * Returns true if the key should be kept
   * on the object, false otherwise.
   */
  filterObjectKeys: (obj, filterFn) => {
    if (!isObject(obj)) return obj;
    const res = {};
    for (const key of Object.keys(obj)) {
      if (filterFn(key, obj[key])) res[key] = obj[key];
    }
    return res;
  },
  isObject,
  sortObjectKeys,
  getObjectDiff,
  isNumber,
  isError: val => val instanceof Error && typeof val.message !== 'undefined',
  isNull,
  isString,
  isBoolean,
  hasKey: (obj, key) => Object.prototype.hasOwnProperty.call(obj, key),
  getNestedValue,
  setEq: (a, b) => a.size === b.size && !Array.from(a).find(e => !b.has(e)),
  isDate: val => val instanceof Date,
  isFunction: val => typeof val === 'function',
  isPrimitive: val =>
    isBoolean(val) || isNumber(val) || isString(val) || isSymbol(val),
  isReadableStream,
  isNonNativeClassInstance,
  isRegExp,
  jsonClone,
  Pair,
  parseBoolean,
};
