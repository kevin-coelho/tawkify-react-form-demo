const moment = require('moment');
const hrtime = require('browser-process-hrtime');

// CONSTANTS
const PRECISION_FACTOR = {
  ms: 1e6,
  ns: 1,
  s: 1e9,
  min: 1e9 * 60,
};

const TIMESTAMP_PRECISION_FACTOR = {
  ms: 1,
  ns: 1e6,
  s: 1 / 1000,
  min: 1 / 1000 / 60,
};

const PRECISION_ABBREVS = {
  milliseconds: 'ms',
  nanoseconds: 'ns',
  seconds: 's',
  minutes: 'min',
};

/**
 * Time class for measuring elapsed with specified precision.
 */
class Time {
  constructor() {
    this.start = hrtime();
  }

  start(precision) {
    if (PRECISION_FACTOR[precision])
      return this.start[1] / PRECISION_FACTOR[precision];
    else return this.start[1] / PRECISION_FACTOR['ms'];
  }

  elapsed(precision) {
    const elapsedHrTime = hrtime(this.start);
    return Time.elapsed(elapsedHrTime, precision);
  }

  /**
   * @param {string} precision one of 'ms', 'ns', 's', 'min', 'auto'
   * @return {string} Return elapsed to 2 decimal points at specified precision
   * @example
   * 'auto' precision:
   * time < 1000ms --> 'ms'
   * time < 60s --> 's'
   * time > 60s --> 'min'
   */
  elapsedPretty(precision) {
    const t =
      precision === 'auto' ? this.elapsed('ms') : this.elapsed(precision);
    return Time.elapsedPretty(t, precision);
  }

  static elapsed(elapsedHrTime, precision) {
    if (PRECISION_FACTOR[precision])
      return (
        (elapsedHrTime[0] * PRECISION_FACTOR['s'] + elapsedHrTime[1]) /
        PRECISION_FACTOR[precision]
      );
    else
      return (
        (elapsedHrTime[0] * PRECISION_FACTOR['s'] + elapsedHrTime[1]) /
        PRECISION_FACTOR['ms']
      );
  }

  /**
   * @param {number} t time in specified precision. t must be milliseconds to use 'auto' precision
   * @param {string} precision one of 'ms', 'ns', 's', 'min', 'auto'
   * @return {string} Return elapsed to 2 decimal points at specified precision
   * @example
   * 'auto' precision:
   * t < 1000ms --> 'ms'
   * t < 60s --> 's'
   * t > 60s --> 'min'
   */
  static elapsedPretty(t, precision) {
    if (precision === 'auto') {
      if (t < 1000) return Time.prettyTime(t, 'ms');
      if (t < 60 * 1000)
        return Time.prettyTime(t * TIMESTAMP_PRECISION_FACTOR['s'], 's');
      return Time.prettyTime(t * TIMESTAMP_PRECISION_FACTOR['min'], 'min');
    }
    return Time.prettyTime(t, precision);
  }

  /**
   * @param time
   * @param {string} precision one of 'ms', 'ns', 's', 'min'
   * @return {string}
   */
  static prettyTime(time, precision) {
    return `${time.toFixed(2)}${precision}`;
  }
}

function valueLabelFormat(value) {
  return moment().startOf('day').seconds(value).format('mm:ss');
}

function getTimestamp(date, precision = 'ms') {
  if (!(date instanceof Date))
    throw new Error('getTimestamp: date must be an instance of js Date type');
  const allowedPrecision = Object.keys(PRECISION_FACTOR).concat(
    Object.keys(PRECISION_ABBREVS),
  );
  if (!allowedPrecision.includes(precision))
    throw new Error(
      `getTimestamp: Invalid precision ${precision}. Must be one of ${allowedPrecision}`,
    );
  if (PRECISION_ABBREVS[precision]) precision = PRECISION_ABBREVS[precision];
  return Math.round(date.getTime() * TIMESTAMP_PRECISION_FACTOR[precision]);
}

module.exports = { Time, getTimestamp, valueLabelFormat };
