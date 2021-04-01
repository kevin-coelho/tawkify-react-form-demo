/* eslint-disable no-useless-escape */
// dependencies
const util = require('util');
const parseShell = require('shell-quote').parse;
const levenshtein = require('fast-levenshtein');
const { parsePhoneNumber, ParseError } = require('libphonenumber-js/max');
const querystring = require('querystring');

// module deps
const { pipe } = require('./function.util');
const {
  isString,
  sortObjectKeys,
  isFunction,
  assignNonNullKeys,
} = require('./object.util');

// CONSTANTS
/**
 * @typedef {Object} UtilInspectDefaultOptions
 * @property {boolean|null} [showHidden] default=false
 * @property {boolean|null} [depth] default=null
 * @property {boolean|null} [colors] default=true
 * @property {number|null} [maxArrayLength] default=10
 *
 * @type {UtilInspectDefaultOptions}
 */
const INSPECT_OPTIONS = {
  showHidden: false,
  depth: null,
  colors: true,
  maxArrayLength: 10,
};

const PATTERNS = {
  quoted: /"(.*?)"|'(.*?)'/g,
  cmdOption: /--([a-zA-Z0-9]*?)(?: |=)(.*)/,
  cmdFlag: /--([a-zA-Z0-9]*)/,
  digitsOnly: /[^0-9]/g,
  digitsAndPlusOnly: /[^0-9+]/g, // for matching phone numbers
  regSpacer: '(?: |, ?|-)', // for inserting into other regexes
  nonAlphaNumeric: /[^a-zA-Z0-9]/g,
  mongoId: /^[a-z0-9]{24}$/, // 5dd83f9df107d61f7eb64617
};

// FUNCTIONS
/**
 * Pretty print a js object using util.inspect. If msg is not an object or function,
 * or is null, return it unchanged.
 * @param {Object} 				msg 					Object to pretty print
 * @param {boolean} 			sort 					If msg is an object, sort its keys. If it is an array, sort it
 * @param {Function} 			compareFn 				If msg is an array and sort is true, sort msg using compareFn -- msg.sort(compareFn)
 * @param {UtilInspectDefaultOptions} 	_inspectOptions 		Optional pass down arguments to util.inspect
 * @return {string|*}
 */
function formatObj(
  msg,
  sort = false,
  compareFn = null,
  _inspectOptions = INSPECT_OPTIONS,
) {
  if (!msg) return msg;
  const inspectOptions = Object.assign(
    {},
    INSPECT_OPTIONS,
    assignNonNullKeys({}, _inspectOptions),
  );
  if (typeof msg === 'object' && !Array.isArray(msg) && !isFunction(msg)) {
    if (sort) {
      return util.inspect(sortObjectKeys(msg), inspectOptions);
    }

    return util.inspect(msg, inspectOptions);
  } else if (Array.isArray(msg)) {
    if (sort) {
      const ordered = compareFn ? msg.sort(compareFn) : msg.sort();
      return util.inspect(ordered, inspectOptions);
    }
    return util.inspect(msg, inspectOptions);
  } else if (isFunction(msg)) {
    return msg.toString(); // note - this only works in V8 compatible js engines! function.toString() is not standard
  }
  return msg;
}

/**
 * Escape a string for use as as RegExp
 * @param str
 * @return {*}
 */
function escapeRegExp(str) {
  if (!str) return str;
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

/**
 * Unicode normalize a string and remove diacritics / accents
 * @param {string} str Input string
 * @return {string|null} Returns null (if input is null), otherwise result string
 */
function unicodeNormalize(str) {
  if (!str) return null;
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Compare 2 strings in an internationally-compatible way.
 * @param {string} a
 * @param {string} b
 * @param {string} [countryCode] default='us' Country to pass to Intl.Collator
 * @param {Object} [options] default={sensitivity:'base', usage:'search', ignorePunctuation:true} Options to pass to Intl.Collator
 * @return {number} (-) if a comes before b, (+) if a comes after b, (0) if they are equal
 */
function strCompareIntl(
  a,
  b,
  countryCode = 'us',
  options = { sensitivity: 'base', usage: 'search', ignorePunctuation: true },
) {
  return new Intl.Collator(countryCode, options).compare(a, b);
}

/**
 * Remove any characters that are not ascii or printable. Specifically,
 * removes chars that are not between ascii codes 32 (space) - 126 (tilde)
 * inclusive if extended is false, otherwise filters chars with ascii codes
 * less than 32 or equal to 127 (DEL control char). Chars greater than 127
 * are allowed (extended ascii codes). If unicode escape is allowed, the char
 * \u001b is allowed.
 *
 * If input string is not a string, this function returns null
 *
 * @param {boolean} allowUnicodeEscape 	Allow str to contain the unicode escape char \u001b
 * @param {boolean} extended 			Allow extended ascii chars (charCode > 127)
 * @return {AsciiFilterFn}
 */
function filterAscii(allowUnicodeEscape = true, extended = true) {
  /**
   * @typedef {Function} AsciiFilterFn
   * @param {string||null||undefined} str
   * @return {string|null}
   * @description Return a copy of str with non-ascii chars filtered out
   */
  return function(str) {
    if (
      str === null ||
      typeof str === 'undefined' ||
      !(typeof str === 'string')
    )
      return null;
    if (extended) {
      const between = (val, start, finish) => val >= start && val < finish;
      const nonCtrl = val =>
        between(val.charCodeAt(0), 32, 127) || val.charCodeAt(0) > 127;

      if (allowUnicodeEscape) {
        return str
          .split('')
          .filter(c => c === '\u001b' || nonCtrl(c))
          .join('');
      } else {
        return str
          .split('')
          .filter(c => nonCtrl(c))
          .join('');
      }
    } else {
      if (allowUnicodeEscape)
        // eslint-disable-next-line no-control-regex
        return str.replace(/[^^\u001b -~]/g, '');
      else return str.replace(/[^ -~]/g, '');
    }
  };
}

/**
 * Filter non-alphanumeric chars from str
 * @param str
 * @return {*}
 */
function filterNonAlphaNumeric(str) {
  if (!str) return str;
  return str.replace(PATTERNS.nonAlphaNumeric, '');
}

/**
 * Return a string stripped of any non-digit characters
 *
 * @param {String} str            Input string
 * @return {null|String}        Returns null (if input is null),
 *                                otherwise result string
 */
function digitsOnly(str) {
  if (str === null || typeof str === 'undefined' || !(typeof str === 'string'))
    return null;
  return str.replace(PATTERNS.digitsOnly, '');
}

/**
 * @param {string} str
 * @param {string} country ISO Alpha-2 country code
 * @param {boolean} extended Return a parsing result even if the number is invalid (such as invalid country)
 * @return {PhoneNumber|ParseError}
 */
function parsePhoneNumberOrError(str, country = undefined, extended = true) {
  try {
    return parsePhoneNumber(str, country, {
      extended,
    });
  } catch (err) {
    return err;
  }
}

/**
 * Attempt to parse 2 phone numbers, a, b, and return true if and only if
 * they can both be parsed (see libphonenumber-js) and they are equal.
 * If ignoreCountry is specified, any country codes parsed from (a, b) will
 * be ignored.
 *
 * WARNING: If only 1 number has a country code, and the other is otherwise
 * equal, this will return true, even if ignoreCountry is false.
 *
 * @param a
 * @param b
 * @param ignoreCountry
 * @param aCountry 						Specify a country to parse a with
 * @param bCountry 						Specify a country to parse b with
 * @return {boolean}
 */
function phoneNumbersEqual(
  a,
  b,
  ignoreCountry = false,
  aCountry = undefined,
  bCountry = undefined,
) {
  if (!isString(a) || !isString(b)) return false;
  a = a.replace(PATTERNS.digitsAndPlusOnly, '');
  b = b.replace(PATTERNS.digitsAndPlusOnly, '');
  if (a === b) return true;
  let aParsed = aCountry
    ? parsePhoneNumberOrError(a, aCountry)
    : parsePhoneNumberOrError(a);
  let bParsed = bCountry
    ? parsePhoneNumberOrError(b, bCountry)
    : parsePhoneNumberOrError(b);
  if (aParsed instanceof ParseError && bParsed instanceof ParseError) {
    return false;
  }
  // try to infer the country from a successfully parsed #
  if (bParsed instanceof ParseError) {
    bParsed = parsePhoneNumberOrError(b, aParsed.country);
  } else if (aParsed instanceof ParseError) {
    aParsed = parsePhoneNumberOrError(a, bParsed.country);
  }
  if (aParsed instanceof ParseError || bParsed instanceof ParseError)
    return false;
  if (ignoreCountry) {
    return aParsed.formatNational() === bParsed.formatNational();
  }
  // ignoreCountry is true, return if the numbers are equal (.number is E.164 format)
  if (aParsed.country !== '001' && bParsed.country !== '001') {
    return aParsed.number === bParsed.number;
  }
  // a or b has country === '001', return comparison on national
  return aParsed.formatNational() === bParsed.formatNational();
}

/**
 * Format a phone number. If the phone number cannot be parsed from
 * text, print the error and return null. Otherwise, return a formatted
 * (international) phone number
 *
 * @param text
 * @param countryCode
 * @param throwErr 				If true, throw parsing errors
 */
function formatPhone(text, countryCode, throwErr = false) {
  if (!countryCode) return null;
  try {
    const parsed = parsePhoneNumber(text, countryCode);
    return parsed.formatInternational();
  } catch (err) {
    if (throwErr) throw err;
    return null;
  }
}

/**
 * Return a lowercased string
 *
 * @param str                    Input string
 * @return {null|String}        Returns null (if input is null),
 *                                otherwise result string
 */
function lowerCase(str) {
  if (str === null || typeof str === 'undefined' || !(typeof str === 'string'))
    return null;
  return str.toLowerCase();
}

/**
 * Collapse any type of adjacent whitespace in str into specified replacer
 * (default ' ' char).
 * @param {string} str
 * @param {string} replacer
 * @return {string|null} Result or null if str is null
 * @example
 * collapseWhitespace(' a  big sentence  with too much space  ', '-') ===
 * 'a-big-sentence-with-too-much-space'
 */
function collapseWhitespace(str, replacer = ' ') {
  if (!str) return null;
  return str
    .trim()
    .split(/\s/)
    .filter(s => s)
    .join(replacer);
}

/**
 * Trim whitespace from both sides of a string
 *
 * @param str
 * @return {*}
 */
function trim(str) {
  if (str === null || typeof str === 'undefined' || !(typeof str === 'string'))
    return null;
  return str.trim();
}

/**
 * Process a string.
 *
 * Currently:
 *   1. Normalize unicode (remove accents, diacritics, etc.)
 *   2. Lowercase
 *   3. Remove all non-ascii / non-printable chars
 *
 * @param  {String} str    string input
 * @return {String}        result string
 */
function normalizeString(str) {
  if (str === null || typeof str === 'undefined' || !(typeof str === 'string'))
    return null;
  return pipe(
    unicodeNormalize,
    filterAscii(false, false),
    lowerCase,
    trim,
  )(str);
}

/**
 * Extract all matches from a string using
 * specified pattern.
 *
 * @param pattern
 * @param str
 * @return {...*[]}
 */
function extractMatches(pattern, str) {
  if (pattern === PATTERNS.quoted) {
    return [...str.matchAll(pattern)].map(match => match[2]);
  }
  return [...str.matchAll(pattern)];
}

/**
 * Parse command options / flags from a string.
 *
 * @param str                    string to extract.
 *                                e.g. '--someoption=somevalue'
 * @return {{}|null}            Extracted flag object
 *                                {
 * 								 	someoption: 'somevalue'
 * 								}
 */
function parseCmdFlags(str) {
  const optionMatch = str.match(PATTERNS.cmdOption);
  if (optionMatch) {
    return {
      [optionMatch[1]]: optionMatch[2],
    };
  }
  const flagMatch = str.match(PATTERNS.cmdFlag);
  if (flagMatch) {
    return {
      [flagMatch[1]]: true,
    };
  }
  return null;
}

/**
 * Parse a command string with options
 *
 * Input:
 * env {
 *     VAR: 'this is an env variable'
 * }
 * cmd --option1=$VAR --option2='another value'
 *
 * Output:
 * {
 *     command: 'cmd',
 *     option1: 'this is an env variable',
 *     option2: 'another value',
 * }
 *
 * @param str                    Input string
 * @param env                    Object with environment variables for injection
 * @return {Object}            Returns an object containing the command
 *                                and any options
 *
 */
function parseCommandString(str, env = {}) {
  const cmdArr = parseShell(str, env);
  if (cmdArr.length === 0) return { command: null };
  const command = cmdArr[0];
  const result = {
    command,
    args: [],
  };
  for (const arg of cmdArr.slice(1)) {
    const flag = parseCmdFlags(arg);
    if (flag) {
      Object.assign(result, flag);
    } else if (arg) {
      result.args.push(arg);
    }
  }
  return result;
}

/**
 * Return true if two strings are "close" within
 * given edit distance
 *
 * @param  {String}  a
 * @param  {String}  b
 * @param  {Number}  distance    Edit distance (integer, recommended == 2)
 * @param  {Boolean} useCollator Use language collator when comparing edit distance
 * @return {Boolean}
 */
function stringClose(a, b, distance = 2, useCollator = true) {
  // both are null --> true, otherwise false
  if (!a || !b) return !(a || b);
  a = normalizeString(a);
  b = normalizeString(b);
  return (
    levenshtein.get(a, b, { useCollator }) <= distance ||
    a.includes(b) ||
    b.includes(a)
  );
}

/**
 * Trim trailing slash from url
 *
 * @param url
 * @return {*}
 */
function trimUrl(url) {
  if (!url) return url;
  if (!isString(url)) return url;
  return url.replace(/\/$/, '');
}

/**
 * Format str to prepend a comma if str is not
 * empty or null, otherwise return str.
 *
 * "thing2" --> ", thing2"
 *
 * @param str
 * @return {string|*}
 */
function prependComma(str) {
  if (!isString(str) || !str) return str;
  return `, ${str}`;
}

/**
 * Examine arr at idx and get the match (if any) specified
 * by matchFn. If a match is found, remove the match text
 * from arr[idx]. If any text remains, splice it back into arr at the
 * specified idx, otherwise arr[idx] will be deleted.
 *
 * IMPORTANT: matchFn should return a SINGLE match (string) or null
 *
 * Example:
 *
 * arr = [
 * 		'189 Main St.',
 * 		'East Aurora, NY 14052'
 * ]
 * idx === 1
 * matchFn = (e) => e.match('14052')[0]
 *
 * Result:
 * Returns: 14052
 * arr = [
 * 		'189 Main St.',
 * 		'East Aurora, NY'
 * ]
 *
 * @param arr
 * @param idx
 * @param matchFn
 * @return {*}
 */
function removeTextFromArrayEntries(arr, idx, matchFn) {
  let matched;
  if (idx >= 0) {
    const entry = arr.splice(idx, 1)[0];
    matched = matchFn(entry);
    if (matched) {
      const remainder = trimCommas(entry.replace(matched, ''));
      if (remainder) arr.splice(idx, 0, remainder);
    } else {
      arr.splice(idx, 0, entry);
    }
  }
  return matched;
}

/**
 * Trim any excessive commas / collapse contiguous or excessive
 * whitespace in text
 *
 * @param text
 * @return {*}
 */
function trimCommas(text) {
  return text
    .split(/\s/)
    .filter(s => s)
    .join(' ')
    .split(',')
    .map(s => s.trim())
    .filter(s => s)
    .join(', ');
}

/**
 * Build a JS URL object from specified config
 * @param config
 * @return {URL}
 */
function urlBuilder(config) {
  let { protocol, host, port, path, queryParams, hash } = config;
  let result = '';
  if (protocol) result += protocol + '://';
  if (host) {
    if (host.endsWith('/')) host = host.slice(0, -1);
    result += host;
  }
  if (port) result += `:${port}`;
  if (path) {
    if (path.startsWith('/')) path = path.slice(1);
    result += `/${path}`;
  }
  if (queryParams) {
    result += querystring.stringify(queryParams);
  }
  if (hash) {
    if (hash.startsWith('#')) hash = hash.slice(1);
    result += `#${hash}`;
  }
  return URL(result);
}

/**
 * @description
 * The splice() method changes the content of a string by removing a range of
 * characters and/or adding new characters.
 *
 * @param {string} str The string to splice
 * @param {number} start Index at which to start changing the string.
 * @param {number} delCount An integer indicating the number of old chars to remove.
 * @param {string} newSubStr The String that is spliced in.
 * @return {string} A new string with the spliced substring.
 */
function spliceStr(str, start, delCount, newSubStr) {
  return (
    str.slice(0, start) + newSubStr + str.slice(start + Math.abs(delCount))
  );
}

module.exports = {
  unicodeNormalize,
  lowerCase,
  digitsOnly,
  normalizeString,
  extractMatches,
  PATTERNS,
  parseCommandString,
  parseCmdFlags,
  filterAscii,
  escapeRegExp,
  stringClose,
  trimUrl,
  prependComma,
  phoneNumbersEqual,
  formatPhone,
  urlBuilder,
  removeTextFromArrayEntries,
  trimCommas,
  formatObj,
  spliceStr,
  filterNonAlphaNumeric,
  collapseWhitespace,
  strCompareIntl,
};
