const { isCelebrateError } = require('celebrate');
const { attachJSONStringify } = require('./error.util');

function extractCelebrateResponseError(err) {
  if (!isCelebrateError(err)) return null;
  const error = new Error('Validation failed');
  error.details = Object.fromEntries(err.details);
  error.code = 400;
  error.status = 400;
  error.name = err.name;
  error.errno = err.errno;
  attachJSONStringify(error);
  return error;
}

module.exports = { extractCelebrateResponseError };