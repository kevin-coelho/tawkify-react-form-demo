/**
 * Returns true if a and b are ~approximately~ equal within given precision
 * and epsilon. Precision specifies the number of decimal points a, b should
 * be rounded to, and epsilon specifies how close a, b should be to be
 * considered equal.
 *
 * @param a
 * @param b
 * @param precision
 * @param epsilon
 * @return {boolean}
 */
function approxEqual(a, b, precision = null, epsilon = Number.EPSILON) {
  if (precision) {
    return Math.abs(b.toFixed(precision) - a.toFixed(precision)) < epsilon;
  }
  return Math.abs(b - a) < epsilon;
}

/**
 * Return a random number between min (inclusive) and max (exclusive)
 * @param {number} min
 * @param {number} max
 * @return {number}
 */
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

module.exports = { approxEqual, getRandomInt };
