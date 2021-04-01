const farmhash = require('farmhash');

/**
 * @callback ObjectHashFn
 * @return {string} Hash of the object
 */

/**
 * @typedef {Object} HashableObject
 * @property {ObjectHashFn} toHash
 */

// NON-BROWSER COMPATIBLE OBJECT UTILITIES!
class GeneralSet {
  constructor() {
    this.map = new Map();
    this[Symbol.iterator] = this.values;
  }

  /**
   * @param {HashableObject} item
   */
  add(item) {
    this.map.set(item.toHash ? item.toHash() : farmhash.hash64(item), item);
  }

  values() {
    return this.map.values();
  }

  /**
   * @param {HashableObject} item
   */
  delete(item) {
    return this.map.delete(item.toHash ? item.toHash() : farmhash.hash64(item));
  }

  clear() {
    return this.map.clear();
  }

  /**
   * @param {HashableObject} item
   */
  has(item) {
    return this.map.has(item.toHash ? item.toHash() : farmhash.hash64(item));
  }

  entries() {
    return this.map.entries();
  }

  keys() {
    return this.map.keys();
  }
}

module.exports = { GeneralSet };
