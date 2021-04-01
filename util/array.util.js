const _ = require('lodash');
const {
  sortObjectKeys,
  excludeObjectKeys,
  getNestedValue,
} = require('./object.util');

/**
 * Helper for cartesianProduct fn
 * @param a
 * @param b
 * @return {*[]}
 */
const cartesianZip = (a, b) =>
  [].concat(...a.map(d => b.map(e => [].concat(d, e))));

/**
 * @description
 * Return the cartesian product of arrays a, b, (...c)
 * @example
 * const result = cartesian([1,2],[10,20],[100,200,300]);
 * result === [ [ 1, 10, 100 ],
 * 	[ 1, 10, 200 ],
 * 	[ 1, 10, 300 ],
 * 	[ 1, 20, 100 ],
 * 	[ 1, 20, 200 ],
 * 	[ 1, 20, 300 ],
 * 	[ 2, 10, 100 ],
 * 	[ 2, 10, 200 ],
 * 	[ 2, 10, 300 ],
 * 	[ 2, 20, 100 ],
 * 	[ 2, 20, 200 ],
 * 	[ 2, 20, 300 ] ];
 * @param {Array} a
 * @param {Array} b
 * @param {...Array} c
 * @return {Array}
 */
function cartesianProduct(a, b, ...c) {
  return b ? cartesianProduct(cartesianZip(a, b), ...c) : a;
}

module.exports = {
  /**
   * Find a value in an array of objects by matching
   * with any single [key, value] pair (provided in an array)
   *
   * @param  [Array of {Object}]      arr  Array containing objects
   * @param  [Array of [key, value]]  keys Array containing [key, value] pairs
   *                                       to match against the objects in arr
   * @return {Object}                      Object in arr matching any of the
   *                                       specified [key, value] pairs in keys
   */
  findByAnyKey: (arr, keys) => {
    return arr.find(e =>
      keys.find(([key, value]) => e[key] && e[key] === value),
    );
  },
  /**
   * Find the last index of _arr that matches condition specified
   * via the provided function, fn. fn should return "true" if array
   * element meets the condition and false otherwise.
   *
   * @param _arr
   * @param fn
   * @return {number} 						-1 if not found, idx otherwise
   */
  findLastIndex: (_arr, fn) => {
    const arr = _arr.slice().reverse();
    const idx = arr.findIndex(fn);
    if (!(idx >= 0)) return -1;
    return arr.length - 1 - idx;
  },
  /**
   * Find a value in an array of objects by matching
   * with all specified [key, value] pairs (provided in an array)
   *
   * @param  [Array of {Object}]      arr  Array containing objects
   * @param  [Array of [key, value]]  keys Array containing [key, value] pairs
   *                                       to match against the objects in arr
   * @return {Object}                      Object in arr matching all of the
   *                                       specified [key, value] pairs in keys
   */
  findByAllKeys: (arr, keys) => {
    return arr.find(e => {
      let match = true;
      keys.forEach(([key, value]) => {
        if (!e[key]) match = false;
        if (e[key] !== value) match = false;
      });
      return match;
    });
  },
  /**
   * Push value into array and return new deduplicated
   * array
   * @param {Array} arr
   * @param {*} values
   * @return {Array} new (copied) array
   */
  pushUnique: (arr, ...values) => {
    return [...new Set(arr.concat([...values]))];
  },
  /**
   * Concat arrays a, b and return a new deduplicated
   * array
   *
   * @return [Array]        new (copied) array
   */
  concatUnique: (a, b) => [...new Set(a.concat(b))],
  /**
   * Get unique values in an array of objects by key
   *
   * @param arr                Input array
   * @param key                String key
   * @return    {Array}        New (unique) array
   */
  uniqueByKey: (arr, key) => {
    const result = [];
    const map = new Map();
    for (const item of arr) {
      if (!map.has(item[key])) {
        map.set(item[key], true);
        result.push(item);
      }
    }
    return result;
  },
  /**
   * Get unique values in an array of objects by
   * multiple keys.
   *
   * IMPORTANT: If a specified key is not defined
   * on an object in the array, the behavior of
   * this function is undefined
   *
   * @param arr                Input array
   * @param keys                Array of keys
   * @return {Array}            New (unique) array
   */
  uniqueByKeys: (arr, keys) => {
    const result = [];
    const map = new Map();
    for (const item of arr) {
      const keyHash = keys.reduce((a, key) => {
        a += item[key] + '-';
        return a;
      }, '');
      if (!map.has(keyHash)) {
        map.set(keyHash, true);
        result.push(item);
      }
    }
    return result;
  },
  /**
   * Filter an array to values corresponding to
   * specified indices
   *
   * @param arr                input array
   * @param indices            selected indices
   * @return {Array}            Result array containing values
   *                            from the original array at the
   *                            specified indices
   */
  filterIndices: (arr, indices) => {
    const result = [];
    for (const idx of indices) {
      result.push(arr[idx]);
    }
    return result;
  },
  /**
   * Remove values from the array at the specified
   * indices and return a new array.
   * If indices exceed the length of the array,
   * this function will stop early and return the
   * resulting array. If the array becomes empty,
   * an empty array will be returned.
   *
   * @param _arr                input array
   * @param indices            indices to remove
   * @return {Array}            result array (copied from input)
   */
  removeIndices: (_arr, indices) => {
    const arr = _.clone(_arr);
    if (!indices) return arr;
    while (indices.length > 0 && arr.length > 0) {
      const idx = indices.splice(0, 1);
      if (idx > arr.length - 1) continue;
      arr.splice(idx, 1);
      for (let i = 0; i < indices.length; i++) {
        indices[i] -= 1;
      }
    }
    return arr;
  },
  /**
   * Compare 2 arrays for equality
   *
   * @param {Array}        a
   * @param {Array}        b
   * @return {Boolean}    true if a and b contain the same elements
   *                      (not necessarily in the same order),
   *                      otherwise false
   */
  arrayEquals: (a, b) => _.isEqual(a.sort(), b.sort()),
  arrayEqualsStrict: (a, b) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  },
  objectArrayEquals: (a, b) =>
    _.isEqual(a.map(sortObjectKeys).sort(), b.map(sortObjectKeys).sort()),
  /**
   * Return true if arr is not an array or is empty
   *
   * @param arr
   * @return {boolean}
   */
  isNotArrayOrEmpty: arr => !Array.isArray(arr) || arr.length === 0,
  excludeArrayObjectKeys: (arr, excludeKeys) =>
    arr.map(e => excludeObjectKeys(e, excludeKeys)),
  /**
   * Sort an array of objects by 0 or more (optionally nested) fields.
   *
   * @param arr 						[{level1:{a:2}}, {level1:{a:1}}]
   * @param fields 					['level1.a']
   * @param desc 						true
   * @return {*} 						[{level1:{a:1}}, {level1:{a:2}}]
   */
  sortByFields: (arr, fields, desc = true) => {
    if (!arr || !Array.isArray(arr) || !fields || !Array.isArray(fields))
      return arr;
    return arr.sort((a, b) => {
      for (const key of fields) {
        const aVal = getNestedValue(a, key);
        const bVal = getNestedValue(b, key);
        if (aVal === bVal) continue;
        if (!aVal && bVal) return -1;
        if (bVal && !aVal) return 1;
        if (aVal < bVal) return desc ? -1 : 1;
        if (bVal < aVal) return desc ? 1 : -1;
      }
      return 0;
    });
  },
  /**
   * Creates an array of elements split into groups the length of size.
   * If array can't be split evenly, the final chunk will be the remaining elements.
   * @param arr
   * @param size
   * @return {Array}
   */
  chunk: (arr, size) => {
    const result = [[]];
    for (let i = 0; i < arr.length; i++) {
      try {
        result[Math.floor(i / size)].push(arr[i]);
      } catch (err) {
        result.push([]);
        result[Math.floor(i / size)].push(arr[i]);
      }
    }
    return result;
  },
  // polyfill for node < 12
  flatMap: (fn, arr) => arr.reduce((a, c) => [...a, ...fn(c)], []),
  cartesianProduct,
  /**
   * Return a new array with members of arr divided into arrays of
   * size batchSize. IMPORTANT: This will modify arr to remove all
   * its members!
   *
   * @param arr
   * @param batchSize
   * @return {[]}
   */
  toBatches: (arr, batchSize) => {
    const result = [];
    while (arr.length) {
      result.push(arr.splice(0, batchSize));
    }
    return result;
  },
};
